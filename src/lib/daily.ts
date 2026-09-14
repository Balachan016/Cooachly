import "server-only";

const apiKey = process.env.DAILY_API_KEY;
const DAILY_API_BASE = "https://api.daily.co/v1";

export const isDailyConfigured = Boolean(apiKey);

/**
 * Creates a Daily.co video room for a booking with cloud recording enabled.
 * The room is only joinable from shortly before the session until a couple
 * hours after (`nbf`/`exp`), and is automatically recorded to the cloud so a
 * transcript + AI summary can be generated afterwards (see the Daily webhook
 * handler at /api/daily/webhook).
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
        enable_recording: "cloud",
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

export async function getDailyRecordingDownloadLink(recordingId: string): Promise<string | null> {
  if (!apiKey) return null;

  const res = await fetch(`${DAILY_API_BASE}/recordings/${recordingId}/access-link`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    console.error("Failed to fetch Daily recording access link", await res.text());
    return null;
  }

  const data = (await res.json()) as { download_link: string };
  return data.download_link;
}
