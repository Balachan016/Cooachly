"use client";

import { useRef, useState } from "react";
import { addAvailability } from "@/actions/availability";
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

export function AvailabilityForm({ defaultTimezone }: { defaultTimezone: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [mode, setMode] = useState<"recurring" | "oneTime">("recurring");

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addAvailability(formData);
        formRef.current?.reset();
        setMode("recurring");
      }}
      className="mt-4 space-y-4"
    >
      <div>
        <Label htmlFor="mode">When</Label>
        <Select
          id="mode"
          name="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "recurring" | "oneTime")}
        >
          <option value="recurring">Every week, on a day</option>
          <option value="oneTime">One-time, on a specific date</option>
        </Select>
      </div>

      {mode === "recurring" ? (
        <div>
          <Label htmlFor="dayOfWeek">Day of week</Label>
          <Select id="dayOfWeek" name="dayOfWeek" defaultValue="1" required>
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <div>
          <Label htmlFor="date">Date</Label>
          <input
            id="date"
            name="date"
            type="date"
            min={todayDateString()}
            required
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-white/15 dark:bg-neutral-800"
          />
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Opens this single day only — doesn&apos;t repeat.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="startTime">Start time</Label>
          <Select id="startTime" name="startTime" defaultValue="09:00" required>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="endTime">End time</Label>
          <Select id="endTime" name="endTime" defaultValue="17:00" required>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label>Class length</Label>
        <p className="text-sm text-black/60 dark:text-white/60">
          Every Cooachly Arts class is 30 minutes.
        </p>
        <input type="hidden" name="sessionLengthMinutes" value="30" />
      </div>

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select id="timezone" name="timezone" defaultValue={defaultTimezone} required>
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
