"use client";

import { useActionState, useEffect, useRef } from "react";
import { recordMonthlyPayment } from "@/actions/payments";
import { Button, Input, Label, Select } from "@/components/ui";

function todayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function RecordPaymentForm({
  students,
  professors,
}: {
  students: { id: string; name: string }[];
  professors: { id: string; name: string; subject: string }[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(recordMonthlyPayment, undefined);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="pay-student">Student</Label>
          <Select id="pay-student" name="studentId" required defaultValue="">
            <option value="" disabled>
              Select a student
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pay-professor">Professor (subject)</Label>
          <Select id="pay-professor" name="professorId" required defaultValue="">
            <option value="" disabled>
              Select a professor
            </option>
            {professors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.subject || "Coaching"}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="pay-amount">Amount (₹)</Label>
          <Input id="pay-amount" name="amount" type="number" min="1" step="1" required placeholder="14400" />
        </div>
        <div>
          <Label htmlFor="pay-date">Date paid</Label>
          <Input id="pay-date" name="paidAt" type="date" defaultValue={todayDateString()} required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="pay-quota">Monthly quota (optional)</Label>
          <Input id="pay-quota" name="monthlyClassQuota" type="number" min="1" max="60" placeholder="8 (default)" />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="pay-notes">Notes (optional)</Label>
          <Input id="pay-notes" name="notes" placeholder="e.g. bank transfer ref" />
        </div>
      </div>
      <input type="hidden" name="currency" value="inr" />
      <Button type="submit" disabled={pending}>
        {pending ? "Recording…" : "Record payment"}
      </Button>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>{state.message}</p>
      )}
    </form>
  );
}
