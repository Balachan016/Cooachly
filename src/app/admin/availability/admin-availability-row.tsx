"use client";

import { useTransition } from "react";
import { adminRemoveAvailability } from "@/actions/admin-availability";
import { Button } from "@/components/ui";

export function AdminAvailabilityRow({
  id,
  professorId,
  label,
  timezone,
  sessionLengthMinutes,
}: {
  id: string;
  professorId: string;
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
      <Button variant="danger" disabled={isPending} onClick={() => startTransition(() => adminRemoveAvailability(id, professorId))}>
        Remove
      </Button>
    </div>
  );
}
