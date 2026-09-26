"use client";

import { useActionState } from "react";
import { startInstantCall } from "@/actions/instant-call";
import { Button, Input, Label, Select } from "@/components/ui";

export function InstantCallForm({
  students,
  professors,
  isDailyConfigured,
}: {
  students: { id: string; name: string }[];
  professors: { id: string; name: string }[];
  isDailyConfigured: boolean;
}) {
  const [state, formAction, pending] = useActionState(startInstantCall, undefined);

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
      {!isDailyConfigured && (
        <div className="w-64">
          <Label htmlFor="ic-link">Meeting link</Label>
          <Input id="ic-link" name="meetingLink" placeholder="https://meet.example.com/…" required />
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Starting…" : "Start instant call"}
      </Button>
      {state?.message && (
        <p className={`w-full text-sm ${state.success ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
