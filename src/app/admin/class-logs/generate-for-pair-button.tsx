"use client";

import { useState, useTransition } from "react";
import { generateStudentSubjectSummary } from "@/actions/monthly-summary";
import { Button } from "@/components/ui";

export function GenerateForPairButton({ studentId, subject }: { studentId: string; subject: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateStudentSubjectSummary(studentId, subject);
            setMessage(result.message);
          })
        }
      >
        {isPending ? "Generating…" : `Generate summary for all sessions to date`}
      </Button>
      {message && <p className="mt-3 text-sm text-black/70 dark:text-white/70">{message}</p>}
    </div>
  );
}
