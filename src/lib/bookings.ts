import type { Prisma } from "@prisma/client";

export type BookingListView = "upcoming" | "completed" | "cancelled" | "reschedules";

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

// How long after a session's own start time the join-nudge cron sweep
// waits before deciding someone's missing — see /api/cron/reminders. The
// cron runs every 5 minutes, so the actual delay before a nudge goes out is
// somewhere between this and this-plus-5-minutes depending on where in the
// cycle a given booking's start time falls.
export const JOIN_NUDGE_DELAY_MS = 2.5 * 60 * 1000;

type CallEventLite = { userId: string | null; eventType: "JOINED" | "LEFT"; occurredAt: Date };

/** Whether a given party's most recent join/leave event (if any) was a join with no leave after it. */
function isCurrentlyJoined(events: CallEventLite[], userId: string): boolean {
  const own = events.filter((e) => e.userId === userId).sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  return own[own.length - 1]?.eventType === "JOINED";
}

export type LiveCallStatus =
  | { kind: "live_both" }
  | { kind: "live_waiting"; missing: "STUDENT" | "PROFESSOR" }
  | { kind: "nobody_joined"; minutesSinceStart: number };

/**
 * Read-only "what's happening in this session right now" view, derived
 * entirely from the CallAttendanceEvent rows Daily's webhook already logs —
 * no new tracking needed. Returns null outside the session's own
 * start/end window (not started yet, or window closed — the latter is the
 * existing past-due/no-show sweep's territory, not this one's) or for a
 * cancelled booking.
 */
export function getLiveCallStatus(
  booking: { studentId: string; professorId: string; startAt: Date; endAt: Date; status: string },
  events: CallEventLite[]
): LiveCallStatus | null {
  if (booking.status === "CANCELLED") return null;
  const now = new Date();
  if (now < booking.startAt || now > booking.endAt) return null;

  const studentJoined = isCurrentlyJoined(events, booking.studentId);
  const professorJoined = isCurrentlyJoined(events, booking.professorId);

  if (studentJoined && professorJoined) return { kind: "live_both" };
  if (studentJoined) return { kind: "live_waiting", missing: "PROFESSOR" };
  if (professorJoined) return { kind: "live_waiting", missing: "STUDENT" };
  return { kind: "nobody_joined", minutesSinceStart: Math.floor((now.getTime() - booking.startAt.getTime()) / 60000) };
}

/** Same join-detection the live-status badge uses, exposed separately for the join-nudge cron sweep, which needs to know *which* party(ies) to nudge rather than a single combined status. */
export function getMissingParties(
  booking: { studentId: string; professorId: string },
  events: CallEventLite[]
): ("STUDENT" | "PROFESSOR")[] {
  const missing: ("STUDENT" | "PROFESSOR")[] = [];
  if (!isCurrentlyJoined(events, booking.studentId)) missing.push("STUDENT");
  if (!isCurrentlyJoined(events, booking.professorId)) missing.push("PROFESSOR");
  return missing;
}

/**
 * Filter half of the Prisma `where` clause for a bookings list. A cancelled
 * session scheduled for today stays in "upcoming" too (still relevant — e.g.
 * may get rebooked same-day), but every cancelled session — today's
 * included — has its own "cancelled" tab. "completed" is sessions that
 * actually happened: either already marked COMPLETED, or still
 * PENDING/CONFIRMED but long enough past their own end time that they
 * clearly aren't still "upcoming" either. "reschedules" isn't actually a
 * status — it's every booking with reschedule activity to review, whatever
 * its current status: a pending student/professor proposal waiting on
 * someone (rescheduleProposedStartAt), or a booking that's already been
 * moved at least once (rescheduledAt) — so admins don't have to scan every
 * tab's full list to find the handful that actually need attention.
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
  if (view === "reschedules") {
    return { OR: [{ rescheduleProposedStartAt: { not: null } }, { rescheduledAt: { not: null } }] };
  }
  return { OR: [{ status: "COMPLETED" }, pastDueButNotYetCompleted] };
}
