"use client";

import { useActionState } from "react";
import { shareTestScore } from "@/actions/tests";
import { Button } from "@/components/ui";

export function ShareScoreButton({ assignmentId }: { assignmentId: string }) {
  const [state, action, pending] = useActionState(shareTestScore, undefined);

  return (
    <form action={action} className="text-right">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sharing…" : "Share test score"}
      </Button>
    </form>
  );
}
