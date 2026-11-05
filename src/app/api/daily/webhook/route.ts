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
// attendance and summaries. So every validly signed delivery is answered
// with 200 — problems are recorded in DailyWebhookEvent with ok=false
// instead of being reported back to Daily — and the slow transcript → AI
// summary → email work runs after the response. Only a bad signature is
// rejected. The reminder cron also re-activates the webhook if it ever ends
// up FAILED (see checkDailyWebhook).

// Room for the post-response transcript download + AI summary + emails.
export const maxDuration = 60;

async function findBookingByRoomName(roomName: string) {
  const bookingId = roomName.replace(/^cooachly-/, "");
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
}

/** Every delivery gets a row, success or failure — see the DailyWebhookEvent model comment for why. */
async function logWebhookEvent(type: string, ok: boolean, error?: string): Promise<void> {
  await prisma.dailyWebhookEvent.create({ data: { type, ok, error } }).catch((err) => {
    console.error("Failed to log Daily webhook event", err);
  });
}

/** Wraps every response this route sends so each delivery — success or failure — is logged exactly once, right where it's decided. */
async function respond(
  type: string,
  ok: boolean,
  body: Record<string, unknown>,
  init?: { status?: number }
): Promise<NextResponse> {
  await logWebhookEvent(type, ok, typeof body.error === "string" ? body.error : undefined);
  return NextResponse.json(body, init);
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
      return respond("signature", false, { error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: DailyEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return respond("unparseable", false, { ok: true, ignored: "Unparseable body" });
  }

  try {
    return await handleEvent(event);
  } catch (err) {
    // Log and still acknowledge: a 500 here counts toward Daily disabling
    // the webhook for every future call.
    console.error(`[daily-webhook] failed handling ${event.type}`, err);
    return respond(event.type, false, { ok: false, error: "Internal error (logged)" });
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
  // participant.joined/participant.left carry user_id/user_name directly on
  // payload, NOT nested under a "participant" object — that nested shape
  // is only how the client-side daily-js SDK event looks, a separate thing
  // from this server-side webhook payload. Reading from a "participant"
  // sub-object (as this used to) always comes back undefined, so every
  // join/leave silently saved as an unidentified participant instead of
  // the real student/professor who joined via their own signed token.
  payload?: {
    room?: string;
    room_name?: string;
    id?: string;
    user_id?: string;
    user_name?: string;
  };
};

async function handleEvent(event: DailyEvent) {
  if (event.type === "meeting.started") {
    const roomName = event.payload?.room;
    if (!roomName) return respond(event.type, false, { ok: false, error: "Missing room" });

    const started = await startTranscription(roomName);
    return respond(event.type, true, { ok: true, transcriptionStarted: started });
  }

  if (event.type === "participant.joined" || event.type === "participant.left") {
    const roomName = event.payload?.room;
    const userId = event.payload?.user_id;
    const userName = event.payload?.user_name;
    if (!roomName) return respond(event.type, false, { ok: false, error: "Missing room" });

    // A non-2xx response here is not just "logged and ignored" — Daily's
    // default retry policy is a circuit breaker that stops sending *any*
    // further webhooks (including meeting.started and transcript.ready-to-
    // download, for every room) once this endpoint looks unhealthy. A join/
    // leave for a room with no matching booking (e.g. a one-off test call
    // made directly in the Daily dashboard) isn't a sign anything is
    // actually broken, so this acknowledges receipt with 200 rather than
    // 404, which only flags these as "ignored" rather than tripping that
    // breaker and silently killing the pipeline for every other booking too.
    const booking = await findBookingByRoomName(roomName);
    if (!booking) return respond(event.type, true, { ok: true, ignored: "Booking not found" });

    // Only trust a participant's user_id if it's actually one of our own
    // user ids — set via /api/daily/join/[bookingId]'s meeting token. A join
    // straight off the bare room link has Daily's own random anonymous id
    // instead, which would otherwise violate the userId foreign key.
    const matchedUser = userId
      ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
      : null;

    await prisma.callAttendanceEvent.create({
      data: {
        bookingId: booking.id,
        userId: matchedUser?.id ?? null,
        participantName: userName ?? null,
        eventType: event.type === "participant.joined" ? "JOINED" : "LEFT",
        occurredAt: event.event_ts ? new Date(event.event_ts * 1000) : new Date(),
      },
    });

    return respond(event.type, true, { ok: true });
  }

  if (event.type === "transcript.ready-to-download") {
    const roomName = event.payload?.room_name;
    const transcriptId = event.payload?.id;
    if (!roomName || !transcriptId) {
      return respond(event.type, false, { ok: false, error: "Missing room_name or id" });
    }

    // Downloading + summarizing + emailing can take well over Daily's
    // response timeout, so acknowledge now and do it after responding. The
    // outcome is logged as its own "transcript.processed" event.
    after(async () => {
      try {
        const result = await processTranscript(roomName, transcriptId);
        await logWebhookEvent("transcript.processed", result.ok, result.error);
      } catch (err) {
        console.error(`[daily-webhook] transcript processing failed for ${roomName}`, err);
        await logWebhookEvent("transcript.processed", false, err instanceof Error ? err.message : String(err));
      }
    });
    return respond(event.type, true, { ok: true, queued: true });
  }

  return respond(event.type, true, { ok: true, ignored: event.type });
}

async function processTranscript(roomName: string, transcriptId: string): Promise<{ ok: boolean; error?: string }> {
  const booking = await findBookingByRoomName(roomName);
  if (!booking) return { ok: true, error: "Booking not found (ignored)" };
  // Daily can redeliver an event; don't re-summarize or re-email.
  if (booking.transcript) return { ok: true, error: "Transcript already stored (ignored)" };

  const downloadLink = await getTranscriptDownloadLink(transcriptId);
  if (!downloadLink) return { ok: false, error: "Could not fetch transcript link" };

  let vttText: string;
  try {
    const vttRes = await fetch(downloadLink);
    if (!vttRes.ok) return { ok: false, error: `Could not download transcript file (${vttRes.status})` };
    vttText = await vttRes.text();
  } catch (err) {
    console.error("Failed to download transcript file", err);
    return { ok: false, error: "Could not reach transcript file host" };
  }
  const transcript = parseVttTranscript(vttText);
  if (!transcript) return { ok: true, error: "Empty transcript" };

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

  return { ok: true };
}
