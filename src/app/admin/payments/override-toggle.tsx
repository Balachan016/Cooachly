"use client";

import { useTransition } from "react";
import { setSlotViewOverride } from "@/actions/payments";

export function OverrideToggle({
  studentId,
  professorId,
  override,
}: {
  studentId: string;
  professorId: string;
  override: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => setSlotViewOverride(studentId, professorId, !override))}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
        override ? "bg-brand-700" : "bg-black/15 dark:bg-white/20"
      }`}
      aria-pressed={override}
      aria-label={override ? "Disable slot-view override" : "Enable slot-view override"}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
          override ? "translate-x-[18px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
