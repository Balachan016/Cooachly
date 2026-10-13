"use client";

import { useActionState } from "react";
import { createPendingInviteAccounts } from "@/actions/invites";
import { Button } from "@/components/ui";

export function ProcessPendingInvitesButton({ count }: { count: number }) {
  const [state, action, pending] = useActionState(createPendingInviteAccounts, undefined);

  if (count === 0 && !state?.message) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/10">
      {count > 0 && (
        <form action={action}>
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Creating…" : `Create accounts for ${count} pending invite${count === 1 ? "" : "s"}`}
          </Button>
        </form>
      )}
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
