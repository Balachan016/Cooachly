"use client";

import { useActionState, useState, useTransition } from "react";
import type { Prisma } from "@prisma/client";
import { updateMonthlyPayment, deleteMonthlyPayment } from "@/actions/payments";
import { Button, Input } from "@/components/ui";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type PaymentWithParties = Prisma.MonthlyPaymentGetPayload<{
  include: { student: true; professor: { include: { professorProfile: true } } };
}>;

/** dateStr for an <input type="date"> defaultValue — local calendar day, not a UTC-shifted one. */
function dateInputValue(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export function PaymentRow({ payment, canEdit }: { payment: PaymentWithParties; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [isDeleting, startDelete] = useTransition();
  const updateAction = updateMonthlyPayment.bind(null, payment.id);
  const [state, formAction, isPending] = useActionState(updateAction, undefined);

  function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete ${payment.student.name}'s payment to ${payment.professor.name} for ${MONTHS[payment.periodMonth - 1]} ${payment.periodYear}? This cannot be undone.`
    );
    if (!confirmed) return;
    startDelete(() => {
      void deleteMonthlyPayment(payment.id);
    });
  }

  return (
    <>
      <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
        <td className="py-2 pr-3 font-medium">{payment.student.name}</td>
        <td className="py-2 pr-3">
          {payment.professor.name} · {payment.professor.professorProfile?.subject || "Coaching"}
        </td>
        <td className="py-2 pr-3">
          {MONTHS[payment.periodMonth - 1]} {payment.periodYear}
        </td>
        <td className="py-2 pr-3 text-right">
          {payment.currency === "inr" ? "₹" : `${payment.currency.toUpperCase()} `}
          {(payment.amountCents / 100).toLocaleString("en-IN")}
        </td>
        <td className="py-2 pr-3">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(payment.paidAt)}</td>
        <td className="py-2 max-w-[16rem] text-xs text-black/60 dark:text-white/60">{payment.notes || "—"}</td>
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
          <td colSpan={7} className="bg-black/[0.02] px-3 py-3 dark:bg-white/[0.02]">
            <form action={formAction} className="flex flex-wrap items-end gap-3">
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Month</label>
                <select name="periodMonth" defaultValue={payment.periodMonth} className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-neutral-800">
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="w-24">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Year</label>
                <Input type="number" name="periodYear" defaultValue={payment.periodYear} />
              </div>
              <div className="w-28">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Amount</label>
                <Input type="number" step="0.01" name="amount" defaultValue={payment.amountCents / 100} />
              </div>
              <div className="w-20">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Currency</label>
                <Input type="text" name="currency" defaultValue={payment.currency} />
              </div>
              <div className="w-40">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Paid on</label>
                <Input type="date" name="paidAt" defaultValue={dateInputValue(payment.paidAt)} />
              </div>
              <div className="w-56">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Notes</label>
                <Input type="text" name="notes" defaultValue={payment.notes ?? ""} />
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
