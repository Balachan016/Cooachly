import "server-only";
import type { Booking, User } from "@prisma/client";
import { sendVoiceCall, isVoiceCallConfigured } from "./sms";
import { logNotification } from "./log";
import { uploadFile, isBlobConfigured } from "@/lib/blob";
import { SITE_CONFIG } from "@/lib/site";

const apiKey = process.env.OPENAI_API_KEY;

export const isJoinNudgeConfigured = Boolean(apiKey) && isBlobConfigured && isVoiceCallConfigured;

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

type SendResult = { skipped: boolean; error?: string; sid?: string; from?: string; to?: string };

/**
 * Shared by the real join-nudge and the admin "test my voice-message setup"
 * button — generates the audio, uploads it, and places an automated phone
 * call that plays it. Returns the same shape logNotification expects, so
 * every caller logs it the same way.
 *
 * This used to send the clip as a WhatsApp voice note instead, but WhatsApp
 * templates don't support an audio header at all (Meta's template header
 * types are TEXT/IMAGE/VIDEO/DOCUMENT only), so a proactive voice note
 * outside a 24h customer-service window always failed with Twilio error
 * 63016 — i.e. for essentially every real student/professor. A phone call
 * isn't subject to that WhatsApp-specific rule, so it actually works.
 */
async function placeNudgeCall(opts: { to: string; text: string; pathname: string }): Promise<SendResult> {
  const audio = await generateSpeech(opts.text);
  if (!audio) return { skipped: true, error: "OpenAI isn't configured, or speech generation failed" };

  const file = new File([new Uint8Array(audio)], `${opts.pathname}.mp3`, { type: "audio/mpeg" });
  const uploaded = await uploadFile({ pathname: `voice-nudges/${opts.pathname}.mp3`, file });
  if (!uploaded.url) return { skipped: true, error: uploaded.error };

  const result = await sendVoiceCall({ to: opts.to, mediaUrl: uploaded.url });
  if (result.skipped) return { skipped: true, error: "Twilio Voice calling isn't configured" };
  return { skipped: false, error: result.error, sid: result.sid, from: result.from, to: result.to };
}

type BookingWithParties = Booking & { student: User; professor: User };

/**
 * One-time automated phone-call nudge for whichever party (student or
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
      channel: "CALL",
      kind: "join_nudge",
      result: { skipped: true, error: "No phone number on file" },
    });
    return;
  }

  const brandName = SITE_CONFIG[recipient.site].brandName;
  const text = `Hi ${recipient.name}, this is an automated voice message from ${brandName}. Your session with ${peer.name} started a few minutes ago and we haven't seen you join yet. Please join now using the link we sent you.`;

  const result = await placeNudgeCall({ to: recipient.phone, text, pathname: `join-nudge-${booking.id}-${missing.toLowerCase()}` });
  await logNotification({ bookingId: booking.id, userId: recipient.id, channel: "CALL", kind: "join_nudge", result });
}

/**
 * Admin-triggered test of the exact same voice-call pipeline the join-nudge
 * uses, placed to the admin's own phone — lets them confirm OpenAI TTS,
 * Vercel Blob, and Twilio Voice are all actually wired up together without
 * waiting for a real session to be short a party.
 */
export async function sendTestVoiceCall(opts: { userId: string; name: string; phone: string; brandName: string }): Promise<{ message: string }> {
  const text = `Hi ${opts.name}, this is a test voice message from ${opts.brandName}, confirming your automated join-nudge call setup is working correctly.`;
  const result = await placeNudgeCall({ to: opts.phone, text, pathname: `test-${opts.userId}-${Date.now()}` });
  await logNotification({ userId: opts.userId, channel: "CALL", kind: "test_voice", result });

  if (!result.skipped && !result.error) return { message: "Voice call: placed — your phone should ring shortly." };
  if (result.skipped) return { message: `Voice call: not configured — ${result.error}` };
  return { message: `Voice call: failed — ${result.error}` };
}
