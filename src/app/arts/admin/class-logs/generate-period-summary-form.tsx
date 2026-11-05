"use client";

import { useState, useTransition } from "react";
import { generateMonthlySummaries } from "@/actions/monthly-summary";
import { Button, Input, Label } from "@/components/ui";

/** "YYYY-MM" for last calendar month, in UTC — just a sensible starting value for the pickers, not itself timezone-sensitive. */
function defaultLastMonth(): string {
  const now = new Date();
  const y = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
  const m = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth();
  return `${y}-${String(m).padStart(2, "0")}`;
}

/**
 * Generates a recap for any custom start/end month span — monthly (same
 * start and end), a semester, a year, or anything else — instead of being
 * locked to "last calendar month." Defaults both pickers to last month so
 * the one-click case still works unchanged.
 */
export function GeneratePeriodSummaryForm({ viewerTimezone }: { viewerTimezone: string }) {
  const initial = defaultLastMonth();
  const [startMonth, setStartMonth] = useState(initial);
  const [endMonth, setEndMonth] = useState(initial);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleClear() {
    setStartMonth(initial);
    setEndMonth(initial);
    setMessage(null);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="summary-start-month">Start month</Label>
          <Input
            id="summary-start-month"
            type="month"
            value={startMonth}
            onChange={(e) => setStartMonth(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="summary-end-month">End month</Label>
          <Input id="summary-end-month" type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} />
        </div>
        <Button
          variant="secondary"
          disabled={isPending || !startMonth || !endMonth}
          onClick={() =>
            startTransition(async () => {
              const result = await generateMonthlySummaries({ startMonth, endMonth, timezone: viewerTimezone });
              setMessage(result.message);
            })
          }
        >
          {isPending ? "Generating…" : "Generate summaries"}
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={handleClear}>
          Clear
        </Button>
      </div>
      <p className="mt-2 text-xs text-black/50 dark:text-white/50">
        Defaults to last month — widen the range for a semester, a year, or any custom span. Dates use your own
        timezone ({viewerTimezone}).
      </p>
      {message && <p className="mt-3 text-sm text-black/70 dark:text-white/70">{message}</p>}
    </div>
  );
}
