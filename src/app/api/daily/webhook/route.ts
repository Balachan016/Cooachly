import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { startTranscription, getTranscriptDownloadLink, parseVttTranscript } from "@/lib/daily";
import { summarizeTranscript } from "@/lib/ai-summary";
import { sendEmail } from "@/lib/notifications/email";
import { SITE_CONFIG } from "@/lib/site";

// Configure this URL as a webhook in your Daily.co dashboard, subscribed to
// "meeting.started" and "transcript.ready-to-download". When a call begins,
// this starts live transcription; when the transcript finishes, it downloads
// it, asks AI for a summary, and emails that summary to both the student and
// professor.

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
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(body) as {
    type: string;
    payload?: { room_name?: string; transcript_id?: string };
  };

  if (event.type === "meeting.started") {
    const roomName = event.payload?.room_name;
    if (!roomName) return NextResponse.json({ ok: false, error: "Missing room_name" }, { status: 400 });

    const started = await startTranscription(roomName);
    return NextResponse.json({ ok: true, transcriptionStarted: started });
  }

  if (event.type === "transcript.ready-to-download") {
    const roomName = event.payload?.room_name;
    const transcriptId = event.payload?.transcript_id;
    if (!roomName || !transcriptId) {
      return NextResponse.json({ ok: false, error: "Missing room_name or transcript_id" }, { status: 400 });
    }

    const booking = await findBookingByRoomName(roomName);
    if (!booking) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });

    const downloadLink = await getTranscriptDownloadLink(transcriptId);
    if (!downloadLink) {
      return NextResponse.json({ ok: false, error: "Could not fetch transcript link" }, { status: 502 });
    }

    const vttRes = await fetch(downloadLink);
    if (!vttRes.ok) {
      return NextResponse.json({ ok: false, error: "Could not download transcript file" }, { status: 502 });
    }
    const transcript = parseVttTranscript(await vttRes.text());
    if (!transcript) {
      return NextResponse.json({ ok: true, transcribed: false });
    }

    const summary = await summarizeTranscript({
      transcript,
      studentName: booking.student.name,
      professorName: booking.professor.name,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        transcript,
        aiSummary: summary,
        summarySentAt: summary ? new Date() : null,
        status: booking.status === "CONFIRMED" ? "COMPLETED" : booking.status,
      },
    });

    if (summary) {
      const brandName = SITE_CONFIG[booking.professor.site].brandName;
      const html = `<p>Here's the AI-generated summary of your ${brandName} session on ${new Intl.DateTimeFormat(
        "en-US",
        { dateStyle: "medium" }
      ).format(booking.startAt)}:</p><pre style="white-space:pre-wrap;font-family:inherit">${summary}</pre>`;

      await Promise.all([
        sendEmail({ to: booking.student.email, subject: `Your ${brandName} session summary`, html }),
        sendEmail({ to: booking.professor.email, subject: `Your ${brandName} session summary`, html }),
      ]);
    }

    return NextResponse.json({ ok: true, transcribed: true, summarized: Boolean(summary) });
  }

  return NextResponse.json({ ok: true, ignored: event.type });
}
