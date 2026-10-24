// Shared "pick a month to view" helper for every overview calendar (admin,
// and each person's own dashboard calendar) — a plain "YYYY-MM" URL param,
// with no current/next restriction (unlike availability-period.ts, this is
// just for looking at a month's history/future, not for setting anything).
export type YearMonth = { year: number; month: number };

export function currentYearMonth(timezone: string, reference: Date = new Date()): YearMonth {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(reference);
  const [year, month] = formatted.split("-").map(Number);
  return { year, month };
}

export function parseMonthParam(raw: string | undefined, fallback: YearMonth): YearMonth {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [year, month] = raw.split("-").map(Number);
    if (month >= 1 && month <= 12) return { year, month };
  }
  return fallback;
}

export function monthParamValue({ year, month }: YearMonth): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftYearMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (((total % 12) + 12) % 12) + 1 };
}

/** A Date that, viewed in any reasonable timezone, still falls within this year/month — safe to hand to code that re-derives year/month via a timezone-aware formatter. */
export function monthReferenceDate({ year, month }: YearMonth): Date {
  return new Date(Date.UTC(year, month - 1, 15));
}

export function monthDisplayLabel({ year, month }: YearMonth): string {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(Date.UTC(year, month - 1, 1)));
}
