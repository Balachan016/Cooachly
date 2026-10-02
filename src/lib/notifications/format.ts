import "server-only";

/**
 * Formats a date for a specific person's own clock. Every notification
 * (email, WhatsApp, push) must go through this with the recipient's stored
 * `timezone` — formatting without an explicit IANA zone uses whatever
 * timezone the server process happens to run in (e.g. UTC on Vercel), which
 * has nothing to do with the recipient's actual local time and silently
 * shows the wrong hour.
 */
export function formatWhenFor(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(date);
}
