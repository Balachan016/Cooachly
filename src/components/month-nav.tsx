import Link from "next/link";
import { monthDisplayLabel, monthParamValue, shiftYearMonth, type YearMonth } from "@/lib/month-nav";

/** Prev/next month arrows + label for an overview calendar — hrefFor builds the full querystring (month param plus whatever other filters the page preserves). */
export function MonthNav({ current, hrefFor }: { current: YearMonth; hrefFor: (ym: YearMonth) => string }) {
  const prev = shiftYearMonth(current, -1);
  const next = shiftYearMonth(current, 1);
  return (
    <div className="flex items-center gap-3 text-sm font-medium">
      <Link href={hrefFor(prev)} className="rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Previous month">
        ←
      </Link>
      <span>{monthDisplayLabel(current)}</span>
      <Link href={hrefFor(next)} className="rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Next month">
        →
      </Link>
    </div>
  );
}

export { monthParamValue };
