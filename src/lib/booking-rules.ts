// Shared between the (server-only) booking action and the client-side
// booking calendar, so it can't depend on "server-only" itself.
export const MIN_SLOTS_PER_BOOKING = 4;
export const MAX_SLOTS_PER_BOOKING = 8;
export const DEMO_SESSION_LENGTH_MINUTES = 30;
export const MAX_RESCHEDULES_PER_MONTH = 1;
