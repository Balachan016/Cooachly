"use client";

import { useActionState, useState } from "react";
import { adminRescheduleBooking } from "@/actions/bookings";
import { Button, FormMessage, Input, Label, Select, Textarea } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

/**
 * Admin-only reschedule control — unlike the student/professor reschedule
 * flow, this lets an admin type in any new date/time (interpreted in a
 * timezone they pick, defaulting to the booking's own) with no cutoff or
 * quota restriction, and no requirement that it match one of the
 * professor's open slots.
 */
export function AdminRescheduleControl({ bookingId, defaultTimezone }: { bookingId: string; defaultTimezone: string }) {
  const [state, action, pending] = useActionState(adminRescheduleBooking, undefined);
  const [open, setOpen] = useState(false);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [localDateTime, setLocalDateTime] = useState("");

  if (state?.success) return null;

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Reschedule
      </Button>
    );
  }

  // Combine the picked date/time with the picked IANA zone into a single
  // "wall clock time in that zone" string — the server action converts this
  // to an absolute instant with date-fns-tz's fromZonedTime.
  const newStartAt = localDateTime ? `${localDateTime}:00` : "";

  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="newStartAt" value={newStartAt} />
      <input type="hidden" name="timezone" value={timezone} />
      <p className="text-sm font-medium">New date &amp; time</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label htmlFor={`reschedule-datetime-${bookingId}`}>Date &amp; time</Label>
          <Input
            id={`reschedule-datetime-${bookingId}`}
            type="datetime-local"
            value={localDateTime}
            onChange={(e) => setLocalDateTime(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor={`reschedule-tz-${bookingId}`}>In this timezone</Label>
          <Select
            id={`reschedule-tz-${bookingId}`}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <Textarea name="reason" rows={2} placeholder="Reason (optional)…" />
      {state?.message && <FormMessage>{state.message}</FormMessage>}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || !localDateTime}>
          {pending ? "Rescheduling…" : "Confirm reschedule"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
