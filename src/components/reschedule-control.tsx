"use client";

import { useState, useTransition } from "react";
import { getRescheduleOptions, rescheduleBooking, type RescheduleOptions, type RescheduleFormState } from "@/actions/bookings";
import { Button, FormMessage, Textarea } from "@/components/ui";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function RescheduleControl({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  const [options, setOptions] = useState<RescheduleOptions | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<RescheduleFormState>(undefined);

  function handleOpen() {
    startTransition(async () => {
      const opts = await getRescheduleOptions(bookingId);
      setOptions(opts);
      setResult(undefined);
      setSelected(null);
      setOpen(true);
    });
  }

  function handleConfirm() {
    if (!selected || !reason.trim()) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("bookingId", bookingId);
      formData.set("newStartAt", selected);
      formData.set("reason", reason.trim());
      const res = await rescheduleBooking(undefined, formData);
      setResult(res);
      if (res?.success) setOpen(false);
    });
  }

  if (!open) {
    return (
      <Button variant="secondary" disabled={isPending} onClick={handleOpen}>
        Reschedule
      </Button>
    );
  }

  if (options && !options.eligible) {
    return (
      <div className="mt-3 w-full">
        <FormMessage>{options.message}</FormMessage>
        <Button variant="secondary" className="mt-2" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    );
  }

  const hasAnySlots = options?.eligible && options.weeks.some((week) => week.some((day) => day && day.slots.length > 0));

  return (
    <div className="mt-3 w-full rounded-lg border border-black/10 p-3 dark:border-white/10">
      {options?.eligible && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Reschedule policy: up to {options.limit} reschedule{options.limit === 1 ? "" : "s"} per calendar month. You
          have <strong>{options.remaining}</strong> remaining this month.
        </p>
      )}

      {!hasAnySlots ? (
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">No open slots in the next two weeks.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
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
              {options?.eligible &&
                options.weeks.map((week, wi) => (
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

      {selected && (
        <div className="mt-3">
          <p className="text-sm font-medium">Why are you rescheduling?</p>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Let us know what happened…"
            required
          />
        </div>
      )}

      {result?.message && <FormMessage>{result.message}</FormMessage>}

      <div className="mt-3 flex gap-2">
        <Button disabled={!selected || !reason.trim() || isPending} onClick={handleConfirm}>
          {isPending ? "Rescheduling…" : "Confirm reschedule"}
        </Button>
        <Button variant="secondary" disabled={isPending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
