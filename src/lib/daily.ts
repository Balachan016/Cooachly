import "server-only";

const apiKey = process.env.DAILY_API_KEY;
const DAILY_API_BASE = "https://api.daily.co/v1";

export const isDailyConfigured = Boolean(apiKey);

// Live transcription is billed per participant-minute on top of Daily's free
// video minutes, so it's opt-in — set DAILY_ENABLE_TRANSCRIPTION="true" to
// turn on transcription + the AI-summary pipeline (see /api/daily/webhook).
// Video calls work either way; without it, sessions just aren't transcribed
// or summarized afterwards.
//
// Prerequisite: transcription must also be enabled on your Daily domain
// with a Deepgram API key (Daily's dashboard → Settings) — this is separate
// from DAILY_API_KEY and is a one-time setup step in Daily's UI.
export const isTranscriptionEnabled = process.env.DAILY_ENABLE_TRANSCRIPTION === "true";

/**
 * Creates a Daily.co video room for a booking. The room is only joinable
 * from shortly before the session until a couple hours after (`nbf`/`exp`).
 * If transcription is enabled, the transcript is persisted to storage so it
 * can be downloaded and summarized afterwards (see the webhook handler at
 * /api/daily/webhook, which starts transcription once the call begins).
 */
export async function createDailyRoomForBooking(opts: {
  bookingId: string;
  startAt: Date;
  endAt: Date;
}): Promise<{ name: string; url: string } | null> {
  if (!apiKey) return null;

  const nbf = Math.floor(opts.startAt.getTime() / 1000) - 15 * 60; // joinable 15 min early
  const exp = Math.floor(opts.endAt.getTime() / 1000) + 2 * 60 * 60; // stays open 2h after for wrap-up

  const res = await fetch(`${DAILY_API_BASE}/rooms`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `cooachly-${opts.bookingId}`,
      privacy: "public",
      properties: {
        ...(isTranscriptionEnabled ? { enable_transcription_storage: true } : {}),
        nbf,
        exp,
      },
    }),
  });

  if (!res.ok) {
    console.error("Failed to create Daily room", await res.text());
    return null;
  }

  const data = (await res.json()) as { name: string; url: string };
  return { name: data.name, url: data.url };
}

/**
 * Creates a Daily room for a booking (if Daily is configured) and stores the
 * room name/url on the booking, also mirroring it into `meetingLink` so
 * existing "join video call" UI works whether or not Daily is set up.
 */
export async function provisionVideoRoomForBooking(booking: {
  id: string;
  startAt: Date;
  endAt: Date;
}) {
  if (!isDailyConfigured) return;

  const { prisma } = await import("@/lib/prisma");
  const room = await createDailyRoomForBooking({
    bookingId: booking.id,
    startAt: booking.startAt,
    endAt: booking.endAt,
  });
  if (!room) return;

  await prisma.booking.update({
    where: { id: booking.id },
    data: { dailyRoomName: room.name, dailyRoomUrl: room.url, meetingLink: room.url },
  });
}

/**
 * Extends how long a Daily room stays open, so an admin-extended booking's
 * video call doesn't get cut off. `newExp` is a Unix timestamp (seconds).
 */
export async function updateDailyRoomExpiry(roomName: string, newExp: number): Promise<boolean> {
  if (!apiKey) return false;

  const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ properties: { exp: newExp } }),
  });

  if (!res.ok) {
    console.error("Failed to update Daily room expiry", await res.text());
    return false;
  }
  return true;
}

/**
 * Starts live transcription for a room. Called from the Daily webhook when
 * a call begins (`meeting.started`), since transcription can only be
 * started once a session is active.
 */
export async function startTranscription(roomName: string): Promise<boolean> {
  if (!apiKey) return false;

  const res = await fetch(`${DAILY_API_BASE}/rooms/${roomName}/transcription/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ language: "en" }),
  });

  if (!res.ok) {
    console.error("Failed to start Daily transcription", await res.text());
    return false;
  }
  return true;
}

export async function getTranscriptDownloadLink(transcriptId: string): Promise<string | null> {
  if (!apiKey) return null;

  const res = await fetch(`${DAILY_API_BASE}/transcript/${transcriptId}/access-link`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch Daily transcript access link", await res.text());
    return null;
  }

  const data = (await res.json()) as { download_link: string };
  return data.download_link;
}

/**
 * Daily delivers transcripts as WebVTT files. This strips the cue numbers,
 * timestamps, and speaker markup down to plain readable text for GPT to
 * summarize and for the admin class-log viewer to display.
 */
export function parseVttTranscript(vtt: string): string {
  return vtt
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (trimmed.startsWith("WEBVTT")) return false;
      if (/^\d+$/.test(trimmed)) return false;
      if (trimmed.includes("-->")) return false;
      return true;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
