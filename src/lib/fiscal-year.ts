// Two fiscal-year conventions the P&L page can roll figures up by, in
// addition to the existing calendar-month view — the underlying revenue/
// payouts/expenses and their INR conversion are unchanged either way; this
// only decides which months count as "the year."
export type FiscalScope = "india" | "usa";

/** The "label year" a given date falls into for a scope — for India, the calendar year the Apr–Mar year *starts* in; for USA, just the calendar year. */
export function currentFiscalYearLabel(scope: FiscalScope, timezone: string, reference: Date = new Date()): number {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(reference);
  const [year, month] = formatted.split("-").map(Number);
  if (scope === "usa") return year;
  return month >= 4 ? year : year - 1;
}

/** [start, end) UTC date range covering that fiscal year. */
export function fiscalYearRange(scope: FiscalScope, labelYear: number): { start: Date; end: Date } {
  if (scope === "usa") {
    return { start: new Date(Date.UTC(labelYear, 0, 1)), end: new Date(Date.UTC(labelYear + 1, 0, 1)) };
  }
  return { start: new Date(Date.UTC(labelYear, 3, 1)), end: new Date(Date.UTC(labelYear + 1, 3, 1)) };
}

export function fiscalYearLabel(scope: FiscalScope, labelYear: number): string {
  if (scope === "usa") return `${labelYear} (Jan–Dec)`;
  return `FY ${labelYear}–${String((labelYear + 1) % 100).padStart(2, "0")} (Apr–Mar)`;
}
