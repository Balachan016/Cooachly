"use client";

import { useActionState, useState } from "react";
import { bookSlot } from "@/actions/bookings";
import { Button, FormMessage } from "@/components/ui";
import type { CalendarDay } from "@/lib/scheduling";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingCalendar({
  professorId,
  weeks,
  timezone,
  bookLabel = "Book session",
}: {
  professorId: string;
  weeks: (CalendarDay | null)[][];
  timezone: string;
  bookLabel?: string;
}) {
  const [state, action, pending] = useActionState(bookSlot, undefined);
  const [selected, setSelected] = useState<string | null>(null);

  const hasAnySlots = weeks.some((week) => week.some((day) => day && day.slots.length > 0));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="professorId" value={professorId} />
      <input type="hidden" name="startAt" value={selected ?? ""} />

      <p className="text-xs text-black/50 dark:text-white/50">
        All times shown in your timezone ({timezone}). Times in <span className="text-red-600 dark:text-red-400">red</span>{" "}
        are already booked.
      </p>

      {!hasAnySlots ? (
        <p className="text-sm text-black/50 dark:text-white/50">No open slots in the next two weeks.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] table-fixed border-collapse text-sm">
            <thead>
              <tr>
                {WEEKDAY_LABELS.map((d) => (
                  <th
                    key={d}
                    className="border border-black/10 bg-black/[0.02] p-1.5 text-xs font-semibold uppercase text-black/50 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/50"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((day, di) => (
                    <td
                      key={di}
                      className="h-28 min-w-[88px] border border-black/10 p-1 align-top dark:border-white/10"
                    >
                      {day && (
                        <div className="flex h-full flex-col gap-0.5 overflow-y-auto">
                          <div className="text-xs font-medium text-black/60 dark:text-white/60">
                            {day.dayNumber}
                            {day.monthLabel ? ` ${day.monthLabel}` : ""}
                          </div>
                          {day.slots.map((slot) => (
                            <button
                              key={slot.startAt}
                              type="button"
                              disabled={slot.booked}
                              onClick={() => setSelected(slot.startAt)}
                              title={slot.booked ? "Already booked" : slot.label}
                              className={`w-full truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight ${
                                slot.booked
                                  ? "cursor-not-allowed bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                  : selected === slot.startAt
                                    ? "bg-brand-700 text-white"
                                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                              }`}
                            >
                              {slot.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={!selected || pending} className="w-full">
        {pending ? "Booking…" : bookLabel}
      </Button>
    </form>
  );
}
