"use client";

import { useTransition } from "react";
import { removeAvailability } from "@/actions/availability";
import { Button } from "@/components/ui";

export function AvailabilityRow({
  id,
  label,
  timezone,
  sessionLengthMinutes,
}: {
  id: string;
  label: string;
  timezone: string;
  sessionLengthMinutes: number;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-sm text-black/50 dark:text-white/50">
          {timezone} &middot; {sessionLengthMinutes}-minute sessions
        </div>
      </div>
      <Button variant="danger" disabled={isPending} onClick={() => startTransition(() => removeAvailability(id))}>
        Remove
      </Button>
    </div>
  );
}
