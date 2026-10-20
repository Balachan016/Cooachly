"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordProfessorPayout } from "@/actions/payments";
import { Button, Input, Label, Select } from "@/components/ui";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function PayoutForm({ professors }: { professors: { id: string; name: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(recordProfessorPayout, undefined);
  const now = new Date();

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="payout-professor">Professor</Label>
          <Select id="payout-professor" name="professorId" required defaultValue="">
            <option value="" disabled>
              Select a professor
            </option>
            {professors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="payout-month">For month</Label>
          <Select id="payout-month" name="periodMonth" defaultValue={String(now.getMonth() + 1)} required>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="payout-year">Year</Label>
          <Input id="payout-year" name="periodYear" type="number" defaultValue={now.getFullYear()} required />
        </div>
        <div>
          <Label htmlFor="payout-amount">Amount (₹)</Label>
          <Input id="payout-amount" name="amount" type="number" min="1" step="1" required placeholder="52000" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="payout-date">Date paid</Label>
          <Input id="payout-date" name="paidAt" type="date" defaultValue={todayDateString()} required />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="payout-notes">Notes (optional)</Label>
          <Input id="payout-notes" name="notes" placeholder="e.g. 32 classes" />
        </div>
      </div>
      <input type="hidden" name="currency" value="inr" />
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record payout"}
      </Button>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>{state.message}</p>
      )}
    </form>
  );
}
