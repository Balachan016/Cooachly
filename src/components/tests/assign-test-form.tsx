"use client";

import { useActionState } from "react";
import { assignTest } from "@/actions/tests";
import { Button } from "@/components/ui";

export function AssignTestForm({ testId, students }: { testId: string; students: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(assignTest, undefined);

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="testId" value={testId} />
      <div className="grid gap-2 sm:grid-cols-2">
        {students.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="studentIds" value={s.id} className="h-4 w-4" />
            {s.name}
          </label>
        ))}
      </div>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Assigning…" : "Assign & notify"}
      </Button>
    </form>
  );
}
