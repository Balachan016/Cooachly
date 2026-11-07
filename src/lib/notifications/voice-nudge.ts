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
      console.error("Failed to generate voice-note speech", await res.text());
      return null;
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    console.error("Failed to reach OpenAI for voice-note speech", err);
    return null;
  }
}

type SendResult = { skipped: boolean; error?: string };

/**
 * Shared by the real join-nudge and the admin "test my voice-message setup"
 * button — generates the audio, uploads it, and sends it as a WhatsApp
 * voice note. Returns the same shape logNotification expects, so every
 * caller logs it the same way.
 */
async function sendVoiceNote(opts: { to: string; text: string; pathname: string }): Promise<SendResult> {
  const audio = await generateSpeech(opts.text);
  if (!audio) return { skipped: true, error: "OpenAI isn't configured, or speech generation failed" };

  const file = new File([new Uint8Array(audio)], `${opts.pathname}.mp3`, { type: "audio/mpeg" });
  const uploaded = await uploadFile({ pathname: `voice-nudges/${opts.pathname}.mp3`, file });
  if (!uploaded) return { skipped: true, error: "Vercel Blob isn't configured" };

  const result = await sendWhatsAppVoiceNote({ to: opts.to, mediaUrl: uploaded.url });
  return result.skipped ? { skipped: true, error: "Twilio WhatsApp isn't configured" } : { skipped: false, error: result.error };
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

  const result = await sendVoiceNote({ to: recipient.phone, text, pathname: `join-nudge-${booking.id}-${missing.toLowerCase()}` });
  await logNotification({ bookingId: booking.id, userId: recipient.id, channel: "WHATSAPP", kind: "join_nudge", result });
}

/**
 * Admin-triggered test of the exact same voice-note pipeline the join-nudge
 * uses, sent to the admin's own WhatsApp number — lets them confirm OpenAI
 * TTS, Vercel Blob, and Twilio WhatsApp are all actually wired up together
 * without waiting for a real session to be short a party.
 */
export async function sendTestVoiceNote(opts: { userId: string; name: string; phone: string; brandName: string }): Promise<{ message: string }> {
  const text = `Hi ${opts.name}, this is a test voice message from ${opts.brandName}, confirming your WhatsApp voice note setup is working correctly.`;
  const result = await sendVoiceNote({ to: opts.phone, text, pathname: `test-${opts.userId}-${Date.now()}` });
  await logNotification({ userId: opts.userId, channel: "WHATSAPP", kind: "test_voice", result });

  if (!result.skipped && !result.error) return { message: "Voice note: sent — check WhatsApp." };
  if (result.skipped) return { message: `Voice note: not configured — ${result.error}` };
  return { message: `Voice note: failed — ${result.error}` };
}
