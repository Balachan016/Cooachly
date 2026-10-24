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

  try {
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
  } catch (err) {
    // A network-level failure reaching Daily's API shouldn't crash whatever
    // booking flow is waiting on this (the booking itself is still valid
    // without a video room yet).
    console.error("Failed to reach Daily API to create room", err);
    return null;
  }
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

  try {
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
  } catch (err) {
    console.error("Failed to reach Daily API to update room expiry", err);
    return false;
  }
}

/**
 * Starts live transcription for a room. Called from the Daily webhook when
 * a call begins (`meeting.started`), since transcription can only be
 * started once a session is active.
 */
export async function startTranscription(roomName: string): Promise<boolean> {
  if (!apiKey) return false;

  try {
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
  } catch (err) {
    console.error("Failed to reach Daily API to start transcription", err);
    return false;
  }
}

/**
 * Creates a signed Daily.co meeting token tagging the joining participant
 * with our own user id and display name. Used by /api/daily/join/[bookingId]
 * so every real join through our own "Join video call" links is reliably
 * attributable in the participant.joined/participant.left webhooks (see
 * /api/daily/webhook) — unlike opening the bare public room URL, where Daily
 * just assigns a random anonymous id and whatever name the user types into
 * its own join screen.
 */
export async function createDailyMeetingToken(opts: {
  roomName: string;
  userId: string;
  userName: string;
  isOwner?: boolean;
}): Promise<string | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          room_name: opts.roomName,
          user_id: opts.userId,
          user_name: opts.userName,
          is_owner: Boolean(opts.isOwner),
        },
      }),
    });

    if (!res.ok) {
      console.error("Failed to create Daily meeting token", await res.text());
      return null;
    }

    const data = (await res.json()) as { token: string };
    return data.token;
  } catch (err) {
    console.error("Failed to reach Daily API to create meeting token", err);
    return null;
  }
}

export async function getTranscriptDownloadLink(transcriptId: string): Promise<string | null> {
  if (!apiKey) return null;

  try {
    const res = await fetch(`${DAILY_API_BASE}/transcript/${transcriptId}/access-link`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      console.error("Failed to fetch Daily transcript access link", await res.text());
      return null;
    }

    // Daily's actual response field is "link", not "download_link" — confirmed
    // by calling this endpoint directly; the mismatch silently returned
    // undefined here, which the webhook route then treated as "no link".
    const data = (await res.json()) as { link: string };
    return data.link;
  } catch (err) {
    console.error("Failed to reach Daily API to fetch transcript link", err);
    return null;
  }
}

/**
 * Daily delivers transcripts as WebVTT files. This strips the cue numbers,
 * timestamps, and speaker markup down to plain readable text for GPT to
 * summarize and for the admin class-log viewer to display.
 */
export function parseVttTranscript(vtt: string): string {
  const lines = vtt.split("\n");
  const textLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("WEBVTT")) continue;
    if (trimmed.includes("-->")) continue;
    // A cue identifier line (e.g. "1", or Daily's "transcript:0") always sits
    // directly above its timing line — checking the next line for "-->" is
    // what actually catches it, since Daily's identifiers aren't purely
    // numeric and a plain digit-only regex misses them.
    if (lines[i + 1]?.trim().includes("-->")) continue;
    textLines.push(trimmed);
  }

  return textLines
    .join(" ")
    // Strips VTT voice markup (e.g. "<v Sam>" / "</v>") while keeping any
    // speaker-name text a tag wraps, e.g. "<v>Sam:</v>Hello?" -> "Sam: Hello?"
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Every event /api/daily/webhook handles. Attendance needs the participant
// events and summaries need the other two, so a webhook missing any of them
// silently loses that feature.
export const REQUIRED_WEBHOOK_EVENTS = [
  "meeting.started",
  "participant.joined",
  "participant.left",
  "transcript.ready-to-download",
] as const;

type DailyWebhook = {
  uuid: string;
  url: string;
  eventTypes?: string[];
  state?: string;
  failedCount?: number;
};

export type DailyWebhookHealth =
  | { status: "not-configured" }
  | { status: "missing" }
  | { status: "active"; url: string }
  | { status: "repaired"; url: string; previousState?: string; addedEvents: string[] }
  | { status: "unhealthy"; url: string; state?: string; failedCount?: number; missingEvents: string[]; error?: string }
  | { status: "error"; error: string };

/**
 * Checks the Daily webhook that drives attendance and AI summaries.
 *
 * Daily switches a webhook to FAILED after three failed deliveries in a row
 * (any non-200 or slow response) and then stops sending events entirely —
 * no transcription is started, no join/leave is recorded, and nothing tells
 * us. With `repair`, a FAILED webhook (or one missing required events) is
 * re-saved via POST /webhooks/:uuid, which makes Daily send a test event
 * and reactivate it on a 200.
 */
export async function checkDailyWebhook({ repair }: { repair: boolean }): Promise<DailyWebhookHealth> {
  if (!apiKey) return { status: "not-configured" };

  try {
    const res = await fetch(`${DAILY_API_BASE}/webhooks`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { status: "error", error: `Daily API ${res.status}: ${await res.text()}` };

    const body = (await res.json()) as DailyWebhook[] | { data?: DailyWebhook[] };
    const webhooks = Array.isArray(body) ? body : (body.data ?? []);
    // Daily allows one webhook per domain; prefer ours if there are several.
    const webhook = webhooks.find((w) => w.url?.includes("/api/daily/webhook")) ?? webhooks[0];
    if (!webhook) return { status: "missing" };

    const eventTypes = webhook.eventTypes ?? [];
    const missingEvents = REQUIRED_WEBHOOK_EVENTS.filter((e) => !eventTypes.includes(e));
    const isFailed = webhook.state === "FAILED";

    if (!isFailed && missingEvents.length === 0) return { status: "active", url: webhook.url };

    const unhealthy = {
      status: "unhealthy" as const,
      url: webhook.url,
      state: webhook.state,
      failedCount: webhook.failedCount,
      missingEvents,
    };
    if (!repair) return unhealthy;

    // Re-send the same signing secret so re-saving can't rotate it out from
    // under DAILY_WEBHOOK_SECRET (which would make every event fail again).
    const secret = process.env.DAILY_WEBHOOK_SECRET;
    const update = await fetch(`${DAILY_API_BASE}/webhooks/${webhook.uuid}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhook.url,
        eventTypes: [...new Set([...eventTypes, ...REQUIRED_WEBHOOK_EVENTS])],
        ...(secret ? { hmac: secret } : {}),
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!update.ok) return { ...unhealthy, error: `Daily API ${update.status}: ${await update.text()}` };

    const updated = (await update.json()) as DailyWebhook;
    if (updated.state === "FAILED") return { ...unhealthy, error: "Daily kept the webhook in FAILED state after re-saving it" };
    return { status: "repaired", url: webhook.url, previousState: webhook.state, addedEvents: missingEvents };
  } catch (err) {
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}
