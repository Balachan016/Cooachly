import "server-only";

// Recurring availability windows only ever run within one calendar month at
// a time (see prisma/schema.prisma's Availability.periodYear/periodMonth) —
// a professor (or admin on their behalf) can set up at most the current
// month and next month, matching the ~2-month window students can already
// book into (see scheduling.ts#bookingWindowDaysFor). "current" / "next" are
// the only two values ever used in a URL, so pages read one of those rather
// than an arbitrary year+month.
export type AvailabilityPeriod = { year: number; month: number };
export type AvailabilityPeriodKey = "current" | "next";

export function currentAvailabilityPeriod(timezone: string, reference: Date = new Date()): AvailabilityPeriod {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(reference);
  const [year, month] = formatted.split("-").map(Number);
  return { year, month };
}

export function nextAvailabilityPeriod(period: AvailabilityPeriod): AvailabilityPeriod {
  return period.month === 12 ? { year: period.year + 1, month: 1 } : { year: period.year, month: period.month + 1 };
}

/** Resolves a "current"/"next" URL param (anything else falls back to "current") into the actual {year, month}. */
export function resolveAvailabilityPeriod(key: string | undefined, timezone: string, reference: Date = new Date()): { key: AvailabilityPeriodKey; period: AvailabilityPeriod } {
  const current = currentAvailabilityPeriod(timezone, reference);
  if (key === "next") return { key: "next", period: nextAvailabilityPeriod(current) };
  return { key: "current", period: current };
}

/** True if the given period is this month or next month, in the given timezone — the only months anyone may set availability for. */
export function isAvailabilityPeriodAllowed(period: AvailabilityPeriod, timezone: string, reference: Date = new Date()): boolean {
  const current = currentAvailabilityPeriod(timezone, reference);
  const next = nextAvailabilityPeriod(current);
  return (period.year === current.year && period.month === current.month) || (period.year === next.year && period.month === next.month);
}

export function availabilityPeriodLabel(period: AvailabilityPeriod): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(Date.UTC(period.year, period.month - 1, 1)));
}

/** First/last plain "YYYY-MM-DD" calendar date of a period, for constraining a one-off date picker to it. */
export function availabilityPeriodDateRange(period: AvailabilityPeriod): { min: string; max: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = new Date(Date.UTC(period.year, period.month, 0)).getUTCDate();
  return {
    min: `${period.year}-${pad(period.month)}-01`,
    max: `${period.year}-${pad(period.month)}-${pad(lastDay)}`,
  };
}
