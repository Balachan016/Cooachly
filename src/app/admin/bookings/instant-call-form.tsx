"use client";

import { useActionState, useState } from "react";
import { startInstantCall } from "@/actions/instant-call";
import { Button, Input, Label, Select } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

export function InstantCallForm({
  students,
  professors,
  isDailyConfigured,
  viewerTimezone,
}: {
  students: { id: string; name: string }[];
  professors: { id: string; name: string }[];
  isDailyConfigured: boolean;
  viewerTimezone: string;
}) {
  const [state, formAction, pending] = useActionState(startInstantCall, undefined);
  const [startAt, setStartAt] = useState("");
  const [timezone, setTimezone] = useState(viewerTimezone);
  const isScheduled = startAt !== "";

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <Label htmlFor="ic-student">Student</Label>
        <Select id="ic-student" name="studentId" required defaultValue="">
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
        <Label htmlFor="ic-professor">Professor</Label>
        <Select id="ic-professor" name="professorId" required defaultValue="">
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
        <Label htmlFor="ic-start-at">Date &amp; time (optional)</Label>
        <Input
          id="ic-start-at"
          name="startAt"
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
        />
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">Leave blank to start right now instead.</p>
      </div>
      {isScheduled && (
        <div className="w-56">
          <Label htmlFor="ic-timezone">In this timezone</Label>
          <Select id="ic-timezone" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
      )}
      {!isDailyConfigured && (
        <div className="w-64">
          <Label htmlFor="ic-link">Meeting link</Label>
          <Input id="ic-link" name="meetingLink" placeholder="https://meet.example.com/…" required />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? (isScheduled ? "Scheduling…" : "Starting…") : isScheduled ? "Schedule session" : "Start instant call"}
      </Button>
      {state?.message && (
        <p className={`w-full text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
