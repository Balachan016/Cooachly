// Shared between the (server-only) booking action and the client-side
// booking calendar, so it can't depend on "server-only" itself.
export const MIN_SLOTS_PER_BOOKING = 4;
export const MAX_SLOTS_PER_BOOKING = 8;
export const DEMO_SESSION_LENGTH_MINUTES = 30;

// Per calendar month, per person — applies equally to students and
// professors. An admin/superadmin acting on a booking (adminCancelBooking,
// adminRescheduleBooking, etc.) goes through entirely separate actions that
// never check these, so admin changes are never limited.
export const MAX_RESCHEDULES_PER_MONTH: number = 2;
export const MAX_CANCELLATIONS_PER_MONTH: number = 1;

// A student can't cancel or (propose a) reschedule a session once it's this
// close to starting — gives the professor a stable, final schedule for the
// next day. Professors aren't held to this: they can still cancel/reschedule
// on short notice when they need to.
export const STUDENT_CHANGE_CUTOFF_HOURS = 23;

export function isPastStudentChangeCutoff(startAt: Date, now: Date = new Date()): boolean {
  return startAt.getTime() - now.getTime() < STUDENT_CHANGE_CUTOFF_HOURS * 60 * 60 * 1000;
}
