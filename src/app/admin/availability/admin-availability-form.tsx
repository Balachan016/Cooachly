"use client";

import { useRef, useState } from "react";
import { adminAddAvailability } from "@/actions/admin-availability";
import { Button, Label, Select } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const HOURS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hours = String(Math.floor(i / 2)).padStart(2, "0");
  const minutes = i % 2 === 0 ? "00" : "30";
  return `${hours}:${minutes}`;
});

function todayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function AdminAvailabilityForm({
  professorId,
  defaultTimezone,
  periodKey,
  dateRange,
}: {
  professorId: string;
  defaultTimezone: string;
  /** Which month tab the page is on — a new recurring window is created for this month. */
  periodKey: "current" | "next";
  /** The selected month's own date range, so a one-time window can't be opened outside it. */
  dateRange: { min: string; max: string };
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"recurring" | "oneTime">("recurring");
  const dateMin = dateRange.min > todayDateString() ? dateRange.min : todayDateString();

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await adminAddAvailability(formData);
        formRef.current?.reset();
        setMode("recurring");
      }}
      className="mt-4 space-y-4"
    >
      <input type="hidden" name="professorId" value={professorId} />
      <input type="hidden" name="periodKey" value={periodKey} />

      <div>
        <Label htmlFor="admin-mode">When</Label>
        <Select id="admin-mode" name="mode" value={mode} onChange={(e) => setMode(e.target.value as "recurring" | "oneTime")}>
          <option value="recurring">Every week, on a day</option>
          <option value="oneTime">One-time, on a specific date</option>
        </Select>
      </div>

      {mode === "recurring" ? (
        <div>
          <Label htmlFor="admin-dayOfWeek">Day of week</Label>
          <Select id="admin-dayOfWeek" name="dayOfWeek" defaultValue="1" required>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="admin-date">Date</Label>
          <input
            id="admin-date"
            name="date"
            type="date"
            min={dateMin}
            max={dateRange.max}
            required
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-white/15 dark:bg-neutral-800"
          />
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">Opens this single day only — doesn&apos;t repeat.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="admin-startTime">Start time</Label>
          <Select id="admin-startTime" name="startTime" defaultValue="09:00" required>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="admin-endTime">End time</Label>
          <Select id="admin-endTime" name="endTime" defaultValue="17:00" required>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="admin-sessionLengthMinutes">Session length</Label>
        <Select id="admin-sessionLengthMinutes" name="sessionLengthMinutes" defaultValue="60" required>
          <option value="45">45 minutes</option>
          <option value="60">60 minutes</option>
          <option value="75">75 minutes</option>
          <option value="90">90 minutes</option>
        </Select>
      </div>

      <div>
        <Label htmlFor="admin-timezone">Timezone</Label>
        <Select id="admin-timezone" name="timezone" defaultValue={defaultTimezone} required>
          {!TIMEZONES.includes(defaultTimezone) && <option value={defaultTimezone}>{defaultTimezone}</option>}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>

      <Button type="submit" className="w-full">
        Add window
      </Button>
    </form>
  );
}
