"use client";

import { useRef } from "react";
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

export function AvailabilityForm({ defaultTimezone }: { defaultTimezone: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await addAvailability(formData);
        formRef.current?.reset();
      }}
      className="mt-4 space-y-4"
    >
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
        <Label htmlFor="sessionLengthMinutes">Session length</Label>
        <Select id="sessionLengthMinutes" name="sessionLengthMinutes" defaultValue="60" required>
          <option value="45">45 minutes</option>
          <option value="60">60 minutes</option>
          <option value="75">75 minutes</option>
          <option value="90">90 minutes</option>
        </Select>
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
