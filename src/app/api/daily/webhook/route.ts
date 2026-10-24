import { NextResponse, after } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { startTranscription, getTranscriptDownloadLink, parseVttTranscript } from "@/lib/daily";
import { summarizeTranscript } from "@/lib/ai-summary";
import { sendEmail } from "@/lib/notifications/email";
import { getAdminCcEmails } from "@/lib/notifications/admin-recipients";
import { formatWhenFor } from "@/lib/notifications/format";
import { sendFeedbackRequestEmails } from "@/lib/notifications/feedback-request";
import { SITE_CONFIG } from "@/lib/site";

// Configure this URL as a webhook in your Daily.co dashboard, subscribed to
// "meeting.started", "participant.joined", "participant.left", and
// "transcript.ready-to-download". When a call begins, this starts live
// transcription; every join/leave is logged as a CallAttendanceEvent for
// that booking's class log; when the transcript finishes, it downloads it,
// asks AI for a summary, and emails that summary to both the student and
// professor.
//
// Daily switches this webhook to FAILED (and stops sending anything) after
// three non-200 or slow responses in a row, which silently stops all
// attendance and summaries. So every event we receive is acknowledged with
// a 200 — rooms without a booking (e.g. admin test calls) are ignored, not
// rejected, and the slow transcript → AI summary → email work runs after
// the response. Only a bad signature is rejected. The reminder cron also
// re-activates the webhook if it ever ends up FAILED (see checkDailyWebhook).

// Room for the post-response transcript download + AI summary + emails.
export const maxDuration = 60;

function ignored(reason: string, detail?: Record<string, unknown>) {
  console.warn(`[daily-webhook] ignored: ${reason}`, detail ?? "");
  return NextResponse.json({ ok: true, ignored: reason });
}

async function findBookingByRoomName(roomName: string) {
  const bookingId = roomName.replace(/^cooachly-/, "");
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
}

export async function POST(request: Request) {
  const body = await request.text();

  const webhookSecret = process.env.DAILY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-webhook-signature");
    const timestamp = request.headers.get("x-webhook-timestamp");
    // Daily's hmac is base64-encoded and must be decoded before use as the
    // HMAC key; the signed payload is "<timestamp>.<raw body>", and the
    // result is compared as base64 (not hex).
    const decodedSecret = Buffer.from(webhookSecret, "base64");
    const expected = crypto
      .createHmac("sha256", decodedSecret)
      .update(`${timestamp}.${body}`)
      .digest("base64");
    if (!timestamp || signature !== expected) {
      // Repeated 401s make Daily disable the webhook — if this shows up for
      // real events, DAILY_WEBHOOK_SECRET doesn't match the webhook's hmac.
      console.error("[daily-webhook] rejected: signature mismatch (check DAILY_WEBHOOK_SECRET)");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: DailyEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return ignored("unparseable body");
  }

  try {
    return await handleEvent(event);
  } catch (err) {
    // Log and still acknowledge: a 500 here counts toward Daily disabling
    // the webhook for every future call.
    console.error(`[daily-webhook] failed handling ${event.type}`, err);
    return NextResponse.json({ ok: false, error: "Internal error (logged)" });
  }
}

type DailyEvent = {
  type: string;
  event_ts?: number;
  // Daily's actual field names, confirmed against their webhook docs:
  // meeting.started/participant.* carry the room under "room"; transcript.
  // ready-to-download carries it under "room_name" and the transcript's
  // own ID under "id" — neither event uses "room_name"+"transcript_id"
  // together, which is what this used to (incorrectly) assume, causing
  // every single webhook delivery to 400 since the pipeline was first set up.
  payload?: {
    room?: string;
    room_name?: string;
    id?: string;
    participant?: { user_id?: string; user_name?: string };
  };
};

async function handleEvent(event: DailyEvent) {
  if (event.type === "meeting.started") {
    const roomName = event.payload?.room;
    if (!roomName) return ignored("meeting.started without room");

    const started = await startTranscription(roomName);
    return NextResponse.json({ ok: true, transcriptionStarted: started });
  }

  if (event.type === "participant.joined" || event.type === "participant.left") {
    const roomName = event.payload?.room;
    const participant = event.payload?.participant;
    if (!roomName) return ignored(`${event.type} without room`);

    const booking = await findBookingByRoomName(roomName);
    if (!booking) return ignored("no booking for room", { roomName });

    // Only trust a participant's user_id if it's actually one of our own
    // user ids — set via /api/daily/join/[bookingId]'s meeting token. A join
    // straight off the bare room link has Daily's own random anonymous id
    // instead, which would otherwise violate the userId foreign key.
    const matchedUser = participant?.user_id
      ? await prisma.user.findUnique({ where: { id: participant.user_id }, select: { id: true } })
      : null;

    await prisma.callAttendanceEvent.create({
      data: {
        bookingId: booking.id,
        userId: matchedUser?.id ?? null,
        participantName: participant?.user_name ?? null,
        eventType: event.type === "participant.joined" ? "JOINED" : "LEFT",
        occurredAt: event.event_ts ? new Date(event.event_ts * 1000) : new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  }

  if (event.type === "transcript.ready-to-download") {
    const roomName = event.payload?.room_name;
    const transcriptId = event.payload?.id;
    if (!roomName || !transcriptId) return ignored("transcript event without room_name or id");

    // Downloading + summarizing + emailing can take well over Daily's
    // response timeout, so acknowledge now and do it after responding.
    after(() =>
      processTranscript(roomName, transcriptId).catch((err) =>
        console.error(`[daily-webhook] transcript processing failed for ${roomName}`, err)
      )
    );
    return NextResponse.json({ ok: true, queued: true });
  }

  return NextResponse.json({ ok: true, ignored: event.type });
}

async function processTranscript(roomName: string, transcriptId: string) {
  const booking = await findBookingByRoomName(roomName);
  if (!booking) return console.warn(`[daily-webhook] no booking for room ${roomName}`);
  // Daily can redeliver an event; don't re-summarize or re-email.
  if (booking.transcript) return console.warn(`[daily-webhook] transcript already stored for ${booking.id}`);

  const downloadLink = await getTranscriptDownloadLink(transcriptId);
  if (!downloadLink) return console.error(`[daily-webhook] could not fetch transcript link for ${booking.id}`);

  let vttText: string;
  try {
    const vttRes = await fetch(downloadLink);
    if (!vttRes.ok) return console.error(`[daily-webhook] transcript download failed (${vttRes.status}) for ${booking.id}`);
    vttText = await vttRes.text();
  } catch (err) {
    return console.error(`[daily-webhook] could not reach transcript file host for ${booking.id}`, err);
  }
  const transcript = parseVttTranscript(vttText);
  if (!transcript) return console.warn(`[daily-webhook] empty transcript for ${booking.id}`);

  const summary = await summarizeTranscript({
    transcript,
    studentName: booking.student.name,
    professorName: booking.professor.name,
  });

  const wasAlreadyCompleted = booking.status === "COMPLETED";

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      transcript,
      aiSummary: summary,
      summarySentAt: summary ? new Date() : null,
      status: booking.status === "CONFIRMED" ? "COMPLETED" : booking.status,
    },
  });

  if (!wasAlreadyCompleted && !booking.isDemo) {
    await sendFeedbackRequestEmails(booking);
  }

  if (summary) {
    const brandName = SITE_CONFIG[booking.professor.site].brandName;
    const summaryHtml = `<pre style="white-space:pre-wrap;font-family:inherit">${summary}</pre>`;

    // Admins are CC'd on the student's copy only — one admin copy per
    // session summary, not two duplicates.
    await Promise.all([
      sendEmail({
        to: booking.student.email,
        cc: getAdminCcEmails(),
        site: booking.student.site,
        subject: `Your ${brandName} session summary`,
        html: `<p>Here's the AI-generated summary of your session with <strong>${booking.professor.name}</strong> on <strong>${formatWhenFor(booking.startAt, booking.student.timezone)}</strong>:</p>${summaryHtml}`,
      }),
      sendEmail({
        to: booking.professor.email,
        site: booking.professor.site,
        subject: `Your ${brandName} session summary`,
        html: `<p>Here's the AI-generated summary of your session with <strong>${booking.student.name}</strong> on <strong>${formatWhenFor(booking.startAt, booking.professor.timezone)}</strong>:</p>${summaryHtml}`,
      }),
    ]);
  }

}
