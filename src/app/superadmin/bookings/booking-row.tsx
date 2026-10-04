"use client";

import { useTransition } from "react";
import type { Booking, User } from "@prisma/client";
import { deleteBooking, superadminCancelBooking } from "@/actions/bookings";
import { Badge, Button } from "@/components/ui";
import { CancelBookingControl } from "@/components/cancel-booking-control";

export function SuperadminBookingRow({ booking }: { booking: Booking & { student: User; professor: User } }) {
  const [isPending, startTransition] = useTransition();
  const canDelete = booking.status === "CONFIRMED";
  const canCancel = booking.status === "PENDING" || booking.status === "CONFIRMED";

  function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete this confirmed session (${booking.student.name} with ${booking.professor.name})? This also deletes its attachments, reviews, and reminder logs, and emails both of them (CC'd to admins) that it was removed. This cannot be undone.`
    );
    if (!confirmed) return;
    startTransition(() => {
      void deleteBooking(booking.id);
    });
  }

  return (
    <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
      <td className="px-4 py-3">
        <Badge>{booking.professor.site}</Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startAt)}
      </td>
      <td className="px-4 py-3">{booking.student.name}</td>
      <td className="px-4 py-3">{booking.professor.name}</td>
      <td className="px-4 py-3">
        <Badge tone={booking.status === "CANCELLED" ? "danger" : booking.status === "COMPLETED" ? "success" : "default"}>
          {booking.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge tone={booking.paymentStatus === "UNPAID" ? "warning" : "success"}>{booking.paymentStatus}</Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right font-medium">${(booking.priceCents / 100).toFixed(2)}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-start gap-2">
          {canCancel && (
            <CancelBookingControl bookingId={booking.id} action={superadminCancelBooking} label="Cancel" />
          )}
          {canDelete && (
            <Button variant="danger" disabled={isPending} onClick={handleDelete}>
              Delete
            </Button>
          )}
          {!canCancel && !canDelete && <span className="text-xs text-black/40 dark:text-white/40">—</span>}
        </div>
      </td>
    </tr>
  );
}
