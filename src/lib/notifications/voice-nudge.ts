import "server-only";
import type { Booking, User } from "@prisma/client";
import { sendWhatsAppVoiceNote } from "./sms";
import { logNotification } from "./log";
import { uploadFile, isBlobConfigured } from "@/lib/blob";
import { SITE_CONFIG } from "@/lib/site";

const apiKey = process.env.OPENAI_API_KEY;

export const isJoinNudgeConfigured = Boolean(apiKey) && isBlobConfigured;

/** Plain TTS audio via OpenAI — same API family as the AI-summary feature, just a different endpoint. */
async function generateSpeech(text: string): Promise<Buffer | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: "alloy", input: text, response_format: "mp3" }),
    });
    if (!res.ok) {
      console.error("Failed to generate join-nudge speech", await res.text());
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("Failed to reach OpenAI for join-nudge speech", err);
    return null;
  }
}

type BookingWithParties = Booking & { student: User; professor: User };

/**
 * One-time WhatsApp voice-note nudge for whichever party (student or
 * professor) hasn't joined a session ~2-3 minutes after its start — see
 * /api/cron/reminders, which calls this once per booking per missing party
 * and then marks the booking so it's never evaluated again. No database
 * access beyond the booking/user rows passed in; this never queries for
 * anything itself.
 */
export async function sendJoinNudge(booking: BookingWithParties, missing: "STUDENT" | "PROFESSOR"): Promise<void> {
  const recipient = missing === "STUDENT" ? booking.student : booking.professor;
  const peer = missing === "STUDENT" ? booking.professor : booking.student;

  if (!recipient.phone) {
    await logNotification({
      bookingId: booking.id,
      userId: recipient.id,
      channel: "WHATSAPP",
      kind: "join_nudge",
      result: { skipped: true, error: "No phone number on file" },
    });
    return;
  }

  const brandName = SITE_CONFIG[recipient.site].brandName;
  const text = `Hi ${recipient.name}, this is an automated voice message from ${brandName}. Your session with ${peer.name} started a few minutes ago and we haven't seen you join yet. Please join now using the link we sent you.`;

  const audio = await generateSpeech(text);
  if (!audio) {
    await logNotification({
      bookingId: booking.id,
      userId: recipient.id,
      channel: "WHATSAPP",
      kind: "join_nudge",
      result: { skipped: true, error: "OpenAI isn't configured, or speech generation failed" },
    });
    return;
  }

  const file = new File([new Uint8Array(audio)], `join-nudge-${booking.id}-${missing.toLowerCase()}.mp3`, { type: "audio/mpeg" });
  const uploaded = await uploadFile({ pathname: `voice-nudges/${booking.id}-${missing.toLowerCase()}.mp3`, file });
  if (!uploaded) {
    await logNotification({
      bookingId: booking.id,
      userId: recipient.id,
      channel: "WHATSAPP",
      kind: "join_nudge",
      result: { skipped: true, error: "Vercel Blob isn't configured" },
    });
    return;
  }

  const result = await sendWhatsAppVoiceNote({ to: recipient.phone, mediaUrl: uploaded.url });
  await logNotification({ bookingId: booking.id, userId: recipient.id, channel: "WHATSAPP", kind: "join_nudge", result });
}
