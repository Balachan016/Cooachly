"use client";

import { useActionState, useState, useTransition } from "react";
import type { SubscriptionExpense } from "@prisma/client";
import { updateSubscriptionExpense, deleteSubscriptionExpense } from "@/actions/payments";
import { Button, Input } from "@/components/ui";

function formatAmount(amountCents: number, currency: string): string {
  const amount = (amountCents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency === "inr" ? `₹${amount}` : currency === "usd" ? `$${amount}` : `${currency.toUpperCase()} ${amount}`;
}

/** dateStr for an <input type="date"> defaultValue — local calendar day, not a UTC-shifted one. */
function dateInputValue(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function ExpenseRow({ expense, inrCents, canEdit }: { expense: SubscriptionExpense; inrCents: number | null; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const updateAction = updateSubscriptionExpense.bind(null, expense.id);
  const [state, formAction, isPending] = useActionState(updateAction, undefined);

  function handleDelete() {
    const confirmed = window.confirm(`Permanently delete the ${expense.serviceName} charge of ${formatAmount(expense.amountCents, expense.currency)}? This cannot be undone.`);
    if (!confirmed) return;
    startDelete(() => {
      void deleteSubscriptionExpense(expense.id);
    });
  }

  return (
    <>
      <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
        <td className="py-2 pr-3 font-medium">{expense.serviceName}</td>
        <td className="py-2 pr-3 text-right">{formatAmount(expense.amountCents, expense.currency)}</td>
        <td className="py-2 pr-3 text-right">
          {inrCents !== null ? `₹${(inrCents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
        </td>
        <td className="py-2 pr-3">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(expense.billedAt)}</td>
        <td className="py-2 text-black/60 dark:text-white/60">{expense.notes ?? "—"}</td>
        {canEdit && (
          <td className="py-2 pl-3">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancel" : "Edit"}
              </Button>
              <Button variant="danger" disabled={isDeleting} onClick={handleDelete}>
                {isDeleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </td>
        )}
      </tr>
      {canEdit && editing && (
        <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
          <td colSpan={6} className="bg-black/[0.02] px-3 py-3 dark:bg-white/[0.02]">
            <form action={formAction} className="flex flex-wrap items-end gap-3">
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Service</label>
                <Input type="text" name="serviceName" defaultValue={expense.serviceName} />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Amount</label>
                <Input type="number" step="0.01" name="amount" defaultValue={expense.amountCents / 100} />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Currency</label>
                <Input type="text" name="currency" defaultValue={expense.currency} />
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Billed on</label>
                <Input type="date" name="billedAt" defaultValue={dateInputValue(expense.billedAt)} />
              </div>
              <div className="w-56">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Notes</label>
                <Input type="text" name="notes" defaultValue={expense.notes ?? ""} />
              </div>
              <Button type="submit" variant="secondary" disabled={isPending}>
                {isPending ? "Saving…" : "Save"}
              </Button>
              {state?.message && (
                <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
                  {state.message}
                </p>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
