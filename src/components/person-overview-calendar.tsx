import type { PersonOverviewMonth } from "@/lib/person-overview-calendar";

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function PersonOverviewCalendar({ month }: { month: PersonOverviewMonth }) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-black/60 dark:text-white/60">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600" /> Booked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500" /> Open
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-7 border-b border-black/10 text-xs font-medium uppercase text-black/50 dark:border-white/10 dark:text-white/50">
            {WEEKDAY_HEADERS.map((d) => (
              <div key={d} className="px-2 py-2">
                {d}
              </div>
            ))}
          </div>
          {month.weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-b border-black/5 dark:border-white/5">
              {week.map((day, di) => (
                <div key={di} className="min-h-[90px] border-r border-black/5 p-2 last:border-r-0 dark:border-white/5">
                  {day && (
                    <>
                      <div className="text-xs font-medium text-black/50 dark:text-white/50">{day.dayNumber}</div>
                      {day.entries.length > 0 ? (
                        <div className="mt-1 max-h-28 space-y-1 overflow-y-auto pr-1">
                          {day.entries.map((entry, ei) => (
                            <div key={ei} className="flex items-start gap-1 text-[11px] leading-tight">
                              <span
                                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                                  entry.status === "booked" ? "bg-blue-600" : "bg-emerald-500"
                                }`}
                              />
                              <span className="text-black/70 dark:text-white/70">
                                {entry.timeLabel}{" "}
                                {entry.status === "booked" ? entry.peerName : entry.peerName ? `open — ${entry.peerName}` : "open"}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-black/30 dark:text-white/30">—</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
