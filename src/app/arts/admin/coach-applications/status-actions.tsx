"use client";

import { useState, useTransition } from "react";
import type { CoachApplicationStatus } from "@prisma/client";
import { updateCoachApplicationStatus, sendCoachInvite } from "@/actions/coach-applications";
import { Button } from "@/components/ui";

const TRANSITIONS: { status: CoachApplicationStatus; label: string; variant: "primary" | "secondary" | "danger" }[] = [
  { status: "REVIEWING", label: "Mark reviewing", variant: "secondary" },
  { status: "APPROVED", label: "Approve", variant: "primary" },
  { status: "REJECTED", label: "Reject", variant: "danger" },
];

export function CoachApplicationStatusActions({
  id,
  status,
}: {
  id: string;
  status: CoachApplicationStatus;
}) {
  const [isPending, startTransition] = useTransition();
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {TRANSITIONS.filter((t) => t.status !== status).map((t) => (
          <Button
            key={t.status}
            variant={t.variant}
            disabled={isPending}
            onClick={() => startTransition(() => updateCoachApplicationStatus(id, t.status))}
          >
            {t.label}
          </Button>
        ))}
        {status === "APPROVED" && (
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const result = await sendCoachInvite(id);
                setInviteMessage(result?.message ?? null);
              })
            }
          >
            Send login invite
          </Button>
        )}
      </div>
      {inviteMessage && <p className="mt-2 text-sm text-black/60 dark:text-white/60">{inviteMessage}</p>}
    </div>
  );
}
