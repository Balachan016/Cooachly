"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";

/** Shared by the professor's own Availability page and the admin Availability tool (both sites) — duplicates the current month's recurring windows into next month. */
export function CopyToNextMonthButton({ action }: { action: () => Promise<void> }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button type="button" variant="secondary" disabled={isPending} onClick={() => startTransition(() => action())}>
      {isPending ? "Copying…" : "Copy this month's windows to next month"}
    </Button>
  );
}
