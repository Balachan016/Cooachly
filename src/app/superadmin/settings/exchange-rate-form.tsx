"use client";

import { useActionState } from "react";
import { updateExchangeRate } from "@/actions/payments";
import { Button, Input, Label } from "@/components/ui";

export function ExchangeRateForm({ fromCurrency, toCurrency, rate }: { fromCurrency: string; toCurrency: string; rate: number | null }) {
  const [state, formAction, pending] = useActionState(updateExchangeRate, undefined);

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="rate-from">From</Label>
          <Input id="rate-from" name="fromCurrency" defaultValue={fromCurrency} required readOnly className="uppercase" />
        </div>
        <div>
          <Label htmlFor="rate-to">To</Label>
          <Input id="rate-to" name="toCurrency" defaultValue={toCurrency} required readOnly className="uppercase" />
        </div>
        <div>
          <Label htmlFor="rate-value">Rate</Label>
          <Input id="rate-value" name="rate" type="number" min="0" step="0.0001" defaultValue={rate ?? ""} required placeholder="83.00" />
        </div>
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Updating…" : "Update rate"}
      </Button>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>{state.message}</p>
      )}
    </form>
  );
}
