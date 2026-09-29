"use client";

import { useTransition } from "react";
import type { DemoRequestStatus } from "@prisma/client";
import { updateDemoRequestStatus } from "@/actions/demo-requests";
import { Button } from "@/components/ui";

const TRANSITIONS: { status: DemoRequestStatus; label: string; variant: "primary" | "secondary" | "danger" }[] = [
  { status: "JOINED", label: "Mark joining", variant: "primary" },
  { status: "DROPPED", label: "Mark dropped", variant: "danger" },
  { status: "PENDING", label: "Reopen", variant: "secondary" },
];

export function DemoRequestStatusActions({ id, status }: { id: string; status: DemoRequestStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {TRANSITIONS.filter((t) => t.status !== status).map((t) => (
        <Button
          key={t.status}
          variant={t.variant}
          disabled={isPending}
          onClick={() => startTransition(() => updateDemoRequestStatus(id, t.status))}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}
