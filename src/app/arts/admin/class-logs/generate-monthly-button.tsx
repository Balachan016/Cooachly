"use client";

import { useState, useTransition } from "react";
import { generateMonthlySummaries } from "@/actions/monthly-summary";
import { Button } from "@/components/ui";

export function GenerateMonthlyButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await generateMonthlySummaries();
            setMessage(result.message);
          })
        }
      >
        {isPending ? "Generating…" : "Generate last month's summaries"}
      </Button>
      {message && <p className="mt-3 text-sm text-black/70 dark:text-white/70">{message}</p>}
    </div>
  );
}
