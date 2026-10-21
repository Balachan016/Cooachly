import Link from "next/link";
import { availabilityPeriodLabel, type AvailabilityPeriod, type AvailabilityPeriodKey } from "@/lib/availability-period";

/** The current/next month tabs every availability page (professor, both sites, and admin) uses to pick which month it's showing/editing. */
export function AvailabilityMonthSwitcher({
  current,
  next,
  active,
  hrefFor,
}: {
  current: AvailabilityPeriod;
  next: AvailabilityPeriod;
  active: AvailabilityPeriodKey;
  hrefFor: (key: AvailabilityPeriodKey) => string;
}) {
  return (
    <div className="inline-flex rounded-lg border border-black/10 p-1 dark:border-white/10">
      {(["current", "next"] as const).map((key) => {
        const period = key === "current" ? current : next;
        const isActive = active === key;
        return (
          <Link
            key={key}
            href={hrefFor(key)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-700 text-white"
                : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
            }`}
          >
            {availabilityPeriodLabel(period)}
          </Link>
        );
      })}
    </div>
  );
}
