"use client";

import { useActionState, useState } from "react";
import { cancelBooking, type CancelBookingState } from "@/actions/bookings";
import { Button, FormMessage, Textarea } from "@/components/ui";

export function CancelBookingControl({
  bookingId,
  action: actionProp,
  label = "Cancel",
}: {
  bookingId: string;
  action?: (state: CancelBookingState, formData: FormData) => Promise<CancelBookingState>;
  label?: string;
}) {
  const [state, action, pending] = useActionState(actionProp ?? cancelBooking, undefined);
  const [open, setOpen] = useState(false);

  if (state?.success) return null;

  if (!open) {
    return (
      <Button variant="danger" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={action} className="mt-2 w-full space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <input type="hidden" name="bookingId" value={bookingId} />
      <p className="text-sm font-medium">Why are you cancelling this session?</p>
      <Textarea name="reason" rows={2} placeholder="Let us know what happened…" required />
      {state?.message && <FormMessage>{state.message}</FormMessage>}
      <div className="flex gap-2">
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Cancelling…" : "Confirm cancellation"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
