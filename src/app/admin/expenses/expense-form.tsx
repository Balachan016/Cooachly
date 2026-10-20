"use client";

import { useActionState, useEffect, useRef } from "react";
import { logSubscriptionExpense } from "@/actions/payments";
import { Button, Input, Label, Select } from "@/components/ui";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ExpenseForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(logSubscriptionExpense, undefined);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="exp-service">Service</Label>
          <Input id="exp-service" name="serviceName" required placeholder="e.g. Vercel, Neon, Twilio" />
        </div>
        <div>
          <Label htmlFor="exp-amount">Amount</Label>
          <Input id="exp-amount" name="amount" type="number" min="0" step="0.01" required placeholder="20.00" />
        </div>
        <div>
          <Label htmlFor="exp-currency">Currency</Label>
          <Select id="exp-currency" name="currency" defaultValue="usd">
            <option value="usd">USD</option>
            <option value="inr">INR</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="exp-date">Billed on</Label>
          <Input id="exp-date" name="billedAt" type="date" defaultValue={todayDateString()} required />
        </div>
      </div>
      <div>
        <Label htmlFor="exp-notes">Notes (optional)</Label>
        <Input id="exp-notes" name="notes" placeholder="e.g. Build plan" />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Logging…" : "Log charge"}
      </Button>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>{state.message}</p>
      )}
    </form>
  );
}
