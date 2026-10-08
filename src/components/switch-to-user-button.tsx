"use client";

import { useActionState } from "react";
import { switchToUser } from "@/actions/auth";
import { Button, FormMessage } from "@/components/ui";

export function SwitchToUserButton({ userId, label = "Log in as" }: { userId: string; label?: string }) {
  const [state, action, pending] = useActionState(switchToUser, undefined);

  return (
    <form action={action} className="inline-flex flex-col items-start gap-1">
      <input type="hidden" name="userId" value={userId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Switching…" : label}
      </Button>
      {state?.message && <FormMessage>{state.message}</FormMessage>}
    </form>
  );
}
