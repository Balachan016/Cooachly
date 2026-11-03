import type { Prisma } from "@prisma/client";

export type BookingListView = "upcoming" | "completed" | "cancelled";

// A session normally only flips to COMPLETED when Daily's transcript webhook
// fires, which needs transcription turned on and an actual transcript to
// come back — a call nobody joined, or with transcription off, never gets
// that update and would otherwise sit in PENDING/CONFIRMED (showing as
// "upcoming") forever. The /api/cron/reminders sweep promotes any such
// booking to COMPLETED once it's this far past its own endAt — the same
// wrap-up window Daily keeps the room open for — and the "upcoming"/
// "completed" filters below treat it as already over on that same cutoff,
// so the tabs read correctly immediately rather than waiting on that cron
// to actually run (which needs an external scheduler hitting it — see
// README — so isn't guaranteed to be configured at all).
export const PAST_DUE_GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Status half of the Prisma `where` clause for a bookings list. A cancelled
 * session scheduled for today stays in "upcoming" too (still relevant — e.g.
 * may get rebooked same-day), but every cancelled session — today's
 * included — has its own "cancelled" tab. "completed" is sessions that
 * actually happened: either already marked COMPLETED, or still
 * PENDING/CONFIRMED but long enough past their own end time that they
 * clearly aren't still "upcoming" either.
 */
export function bookingStatusFilter(view: BookingListView): Prisma.BookingWhereInput {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const cancelledToday: Prisma.BookingWhereInput = {
    status: "CANCELLED",
    startAt: { gte: todayStart, lt: todayEnd },
  };
  const pastDueCutoff = new Date(now.getTime() - PAST_DUE_GRACE_MS);
  const stillLive: Prisma.BookingWhereInput = { status: { in: ["PENDING", "CONFIRMED"] }, endAt: { gte: pastDueCutoff } };
  const pastDueButNotYetCompleted: Prisma.BookingWhereInput = {
    status: { in: ["PENDING", "CONFIRMED"] },
    endAt: { lt: pastDueCutoff },
  };

  if (view === "upcoming") {
    return { OR: [stillLive, cancelledToday] };
  }
  if (view === "cancelled") {
    return { status: "CANCELLED" };
  }
  return { OR: [{ status: "COMPLETED" }, pastDueButNotYetCompleted] };
}
