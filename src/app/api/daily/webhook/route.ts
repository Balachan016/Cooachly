import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getDailyRecordingDownloadLink } from "@/lib/daily";
import { transcribeRecording, summarizeTranscript } from "@/lib/ai-summary";
import { sendEmail } from "@/lib/notifications/email";

// Configure this URL as a webhook in your Daily.co dashboard, subscribed to
// the "recording.ready-to-download" event. When a session's cloud recording
// finishes processing, this downloads it, transcribes it, asks AI for a
// summary, and emails that summary to both the student and professor.

export async function POST(request: Request) {
  const body = await request.text();

  const webhookSecret = process.env.DAILY_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-webhook-signature");
    const expected = crypto.createHmac("sha256", webhookSecret).update(body).digest("hex");
    if (signature !== expected) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  const event = JSON.parse(body) as {
    type: string;
    payload?: { recording_id?: string; room_name?: string };
  };

  if (event.type !== "recording.ready-to-download") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const roomName = event.payload?.room_name;
  const recordingId = event.payload?.recording_id;
  if (!roomName || !recordingId) {
    return NextResponse.json({ ok: false, error: "Missing room_name or recording_id" }, { status: 400 });
  }

  const bookingId = roomName.replace(/^cooachly-/, "");
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking) {
    return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
  }

  const downloadLink = await getDailyRecordingDownloadLink(recordingId);
  if (!downloadLink) {
    return NextResponse.json({ ok: false, error: "Could not fetch recording link" }, { status: 502 });
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { recordingUrl: downloadLink } });

  const transcript = await transcribeRecording(downloadLink);
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
    const html = `<p>Here's the AI-generated summary of your Cooachly session on ${new Intl.DateTimeFormat(
      "en-US",
      { dateStyle: "medium" }
    ).format(booking.startAt)}:</p><pre style="white-space:pre-wrap;font-family:inherit">${summary}</pre>`;

    await Promise.all([
      sendEmail({ to: booking.student.email, subject: "Your Cooachly session summary", html }),
      sendEmail({ to: booking.professor.email, subject: "Your Cooachly session summary", html }),
    ]);
  }

  return NextResponse.json({ ok: true, transcribed: true, summarized: Boolean(summary) });
}
