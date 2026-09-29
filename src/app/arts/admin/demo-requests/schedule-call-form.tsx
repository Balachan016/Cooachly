"use client";

import { useActionState } from "react";
import { scheduleDemoCall } from "@/actions/demo-requests";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

type ProfessorOption = { id: string; name: string; subject: string };

export function ScheduleCallForm({
  demoRequestId,
  professors,
  defaultProfessorId,
  defaultScheduledAt,
  defaultMeetingLink,
  defaultAdminNotes,
}: {
  demoRequestId: string;
  professors: ProfessorOption[];
  defaultProfessorId?: string | null;
  defaultScheduledAt?: string | null;
  defaultMeetingLink?: string | null;
  defaultAdminNotes?: string | null;
}) {
  const action = scheduleDemoCall.bind(null, demoRequestId);
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor={`professor-${demoRequestId}`}>Guru</Label>
        <Select id={`professor-${demoRequestId}`} name="professorId" defaultValue={defaultProfessorId ?? ""} required>
          <option value="" disabled>
            Choose a guru…
          </option>
          {professors.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.subject ? ` (${p.subject})` : ""}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor={`scheduledAt-${demoRequestId}`}>Call date &amp; time</Label>
        <Input
          id={`scheduledAt-${demoRequestId}`}
          name="scheduledAt"
          type="datetime-local"
          defaultValue={defaultScheduledAt ?? ""}
          required
        />
      </div>
      <div>
        <Label htmlFor={`meetingLink-${demoRequestId}`}>Meeting link (optional)</Label>
        <Input
          id={`meetingLink-${demoRequestId}`}
          name="meetingLink"
          type="url"
          placeholder="https://…"
          defaultValue={defaultMeetingLink ?? ""}
        />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor={`adminNotes-${demoRequestId}`}>Admin notes (optional)</Label>
        <Textarea
          id={`adminNotes-${demoRequestId}`}
          name="adminNotes"
          rows={2}
          defaultValue={defaultAdminNotes ?? ""}
          placeholder="Notes for your team about this lead…"
        />
      </div>

      {state?.message && (
        <p
          className={`sm:col-span-2 text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}
        >
          {state.message}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Saving…" : "Schedule call"}
        </Button>
      </div>
    </form>
  );
}
