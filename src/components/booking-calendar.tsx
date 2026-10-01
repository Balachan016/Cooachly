"use client";

import { useActionState, useState } from "react";
import { bookSlots } from "@/actions/bookings";
import { Button, FormMessage } from "@/components/ui";
import { MIN_SLOTS_PER_BOOKING, MAX_SLOTS_PER_BOOKING } from "@/lib/booking-rules";
import type { CalendarDay } from "@/lib/scheduling";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function BookingCalendar({
  professorId,
  weeks,
  timezone,
  bookLabel = "Book sessions",
}: {
  professorId: string;
  weeks: (CalendarDay | null)[][];
  timezone: string;
  bookLabel?: string;
}) {
  const [state, action, pending] = useActionState(bookSlots, undefined);
  const [selected, setSelected] = useState<string[]>([]);

  const hasAnySlots = weeks.some((week) => week.some((day) => day && day.slots.length > 0));
  const canSubmit = selected.length >= MIN_SLOTS_PER_BOOKING && selected.length <= MAX_SLOTS_PER_BOOKING && !pending;

  function toggle(startAt: string) {
    setSelected((prev) => {
      if (prev.includes(startAt)) return prev.filter((s) => s !== startAt);
      if (prev.length >= MAX_SLOTS_PER_BOOKING) return prev;
      return [...prev, startAt];
    });
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="professorId" value={professorId} />
      {selected.map((s) => (
        <input key={s} type="hidden" name="startAts" value={s} />
      ))}

      <p className="text-xs text-black/50 dark:text-white/50">
        All times shown in your timezone ({timezone}). Times in <span className="text-red-600 dark:text-red-400">red</span>{" "}
        are already booked. Select between {MIN_SLOTS_PER_BOOKING} and {MAX_SLOTS_PER_BOOKING} sessions to book at
        once.
      </p>

      {!hasAnySlots ? (
        <p className="text-sm text-black/50 dark:text-white/50">No open slots in the next two weeks.</p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-sm">
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
                      className="h-36 min-w-[130px] border border-black/10 p-1 align-top dark:border-white/10"
                    >
                      {day && (
                        <div className="flex h-full flex-col gap-0.5 overflow-y-auto">
                          <div className="text-xs font-medium text-black/60 dark:text-white/60">
                            {day.dayNumber}
                            {day.monthLabel ? ` ${day.monthLabel}` : ""}
                          </div>
                          {day.slots.map((slot) => {
                            const isSelected = selected.includes(slot.startAt);
                            const atLimit = !isSelected && selected.length >= MAX_SLOTS_PER_BOOKING;
                            const disabled = slot.booked || atLimit;
                            return (
                              <button
                                key={slot.startAt}
                                type="button"
                                disabled={disabled}
                                onClick={() => toggle(slot.startAt)}
                                title={
                                  slot.booked ? "Already booked" : atLimit ? `You can only select up to ${MAX_SLOTS_PER_BOOKING}` : slot.label
                                }
                                className={`w-full truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight ${
                                  slot.booked
                                    ? "cursor-not-allowed bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                    : isSelected
                                      ? "bg-brand-700 text-white"
                                      : atLimit
                                        ? "cursor-not-allowed bg-black/5 text-black/30 dark:bg-white/5 dark:text-white/30"
                                        : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                                }`}
                              >
                                {isSelected ? "✓ " : ""}
                                {slot.label}
                              </button>
                            );
                          })}
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-black/60 dark:text-white/60">
          {selected.length} of {MAX_SLOTS_PER_BOOKING} selected
          {selected.length < MIN_SLOTS_PER_BOOKING ? ` (minimum ${MIN_SLOTS_PER_BOOKING})` : ""}
        </span>
        <Button type="submit" disabled={!canSubmit} className="flex-1 sm:flex-none sm:px-8">
          {pending ? "Booking…" : bookLabel}
        </Button>
      </div>
    </form>
  );
}
