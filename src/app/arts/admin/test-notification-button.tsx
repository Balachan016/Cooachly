"use client";

import { useState, useTransition } from "react";
import { sendTestNotification } from "@/actions/admin";
import { Button } from "@/components/ui";

export function TestNotificationButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div>
      <Button
        variant="secondary"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await sendTestNotification();
            setMessage(result.message);
          })
        }
      >
        {isPending ? "Sending…" : "Send test notification to my account"}
      </Button>
      {message && <p className="mt-3 text-sm text-black/70 dark:text-white/70">{message}</p>}
    </div>
  );
}
