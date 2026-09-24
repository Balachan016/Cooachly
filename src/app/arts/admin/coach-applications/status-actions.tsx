"use client";

import { useTransition } from "react";
import type { CoachApplicationStatus } from "@prisma/client";
import { updateCoachApplicationStatus } from "@/actions/coach-applications";
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

  return (
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
    </div>
  );
}
