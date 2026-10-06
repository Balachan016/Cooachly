"use client";

import { useActionState, useState } from "react";
import { extendTestDueDate } from "@/actions/tests";
import { Button, Input } from "@/components/ui";

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ExtendDueDateForm({ testId, currentDueAt }: { testId: string; currentDueAt: string }) {
  const [state, action, pending] = useActionState(extendTestDueDate, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Change due date
      </Button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="testId" value={testId} />
      <Input name="dueAt" type="datetime-local" defaultValue={toLocalInputValue(currentDueAt)} required />
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
