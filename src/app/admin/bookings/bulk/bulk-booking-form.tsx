"use client";

import { useActionState, useState } from "react";
import { createBulkBooking } from "@/actions/bulk-booking";
import { Button, Input, Label, Select } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

let nextSlotKey = 0;
function newSlot(dayOfWeek: number, time: string) {
  return { key: nextSlotKey++, dayOfWeek, time };
}

export function BulkBookingForm({
  students,
  professors,
  viewerTimezone,
}: {
  students: { id: string; name: string }[];
  professors: { id: string; name: string }[];
  viewerTimezone: string;
}) {
  const [state, formAction, pending] = useActionState(createBulkBooking, undefined);
  const [slots, setSlots] = useState(() => [newSlot(1, "16:00")]);

  function addSlot() {
    setSlots((prev) => [...prev, newSlot(1, "16:00")]);
  }
  function removeSlot(key: number) {
    setSlots((prev) => (prev.length > 1 ? prev.filter((s) => s.key !== key) : prev));
  }
  function updateSlot(key: number, patch: Partial<{ dayOfWeek: number; time: string }>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="w-56">
          <Label htmlFor="bb-student">Student</Label>
          <Select id="bb-student" name="studentId" required defaultValue="">
            <option value="" disabled>
              Select a student
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Label htmlFor="bb-professor">Professor</Label>
          <Select id="bb-professor" name="professorId" required defaultValue="">
            <option value="" disabled>
              Select a professor
            </option>
            {professors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-56">
          <Label htmlFor="bb-subject">Subject (optional)</Label>
          <Input id="bb-subject" name="subject" placeholder="e.g. Chemistry" />
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="w-48">
          <Label htmlFor="bb-start">Start date</Label>
          <Input id="bb-start" name="startDate" type="date" required />
        </div>
        <div className="w-48">
          <Label htmlFor="bb-end">End date</Label>
          <Input id="bb-end" name="endDate" type="date" required />
        </div>
        <div className="w-56">
          <Label htmlFor="bb-timezone">Timezone</Label>
          <Select id="bb-timezone" name="timezone" defaultValue={viewerTimezone}>
            {!TIMEZONES.includes(viewerTimezone) && <option value={viewerTimezone}>{viewerTimezone}</option>}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">Every day/time below is in this timezone.</p>
        </div>
      </div>

      <div>
        <Label htmlFor="bb-slot-0-day">Weekly time slots</Label>
        <div className="space-y-2">
          {slots.map((slot, i) => (
            <div key={slot.key} className="flex flex-wrap items-center gap-2">
              <Select
                id={i === 0 ? "bb-slot-0-day" : undefined}
                name="slotDay"
                value={slot.dayOfWeek}
                onChange={(e) => updateSlot(slot.key, { dayOfWeek: Number(e.target.value) })}
                className="w-40"
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </Select>
              <Input
                type="time"
                name="slotTime"
                value={slot.time}
                onChange={(e) => updateSlot(slot.key, { time: e.target.value })}
                className="w-32"
              />
              <button
                type="button"
                onClick={() => removeSlot(slot.key)}
                disabled={slots.length === 1}
                className="text-sm font-medium text-black/50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/50 dark:hover:text-red-400"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSlot}
          className="mt-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
        >
          + Add another day/time
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating sessions…" : "Create bookings for this schedule"}
        </Button>
        {state?.message && (
          <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
            {state.message}
          </p>
        )}
      </div>

      {state?.results && state.results.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-black/10 text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {state.results.map((r, i) => (
                <tr key={i} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="whitespace-nowrap py-2 pr-3">{r.when}</td>
                  <td className="py-2 pr-3">
                    <span className={r.status === "created" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2">{r.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
