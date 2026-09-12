"use client";

import { useTransition } from "react";
import { removeAvailability } from "@/actions/availability";
import { Button } from "@/components/ui";

export function AvailabilityRow({ id, label, timezone }: { id: string; label: string; timezone: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-black/50 dark:text-white/50">{timezone}</div>
      </div>
      <Button variant="danger" disabled={isPending} onClick={() => startTransition(() => removeAvailability(id))}>
        Remove
      </Button>
    </div>
  );
}
