export function isPastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}

/**
 * Whether a booking's video call link should be shown to a student or
 * professor right now — from `leadMinutes` before the session starts until
 * it ends, so people can't join hours early but can still join a session
 * already in progress.
 */
export function isWithinJoinWindow(startAt: Date, endAt: Date, leadMinutes = 5): boolean {
  const now = Date.now();
  return now >= startAt.getTime() - leadMinutes * 60_000 && now <= endAt.getTime();
}
