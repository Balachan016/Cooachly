"use client";

import { useTransition } from "react";
import type { Attachment, Booking, User } from "@prisma/client";
import { extendBooking } from "@/actions/bookings";
import { Badge, Button } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";

export function AdminBookingRow({
  booking,
}: {
  booking: Booking & { student: User; professor: User; attachments: Attachment[] };
}) {
  const [isPending, startTransition] = useTransition();
  const canExtend = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";

  return (
    <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
      <td className="px-4 py-3">
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
      <td className="px-4 py-3">${(booking.priceCents / 100).toFixed(2)}</td>
      <td className="px-4 py-3">
        {booking.meetingLink && booking.status !== "CANCELLED" ? (
          <a
            href={booking.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-green-700 hover:underline dark:text-green-400"
          >
            Join call →
          </a>
        ) : (
          <span className="text-black/30 dark:text-white/30">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {canExtend ? (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => startTransition(() => extendBooking(booking.id, 15))}
            >
              +15 min
            </Button>
            <Button
              variant="secondary"
              disabled={isPending}
              onClick={() => startTransition(() => extendBooking(booking.id, 30))}
            >
              +30 min
            </Button>
          </div>
        ) : (
          <span className="text-black/30 dark:text-white/30">—</span>
        )}
      </td>
      <td className="min-w-[220px] px-4 py-3">
        <AttachmentPanel
          bookingId={booking.id}
          attachments={booking.attachments}
          canUploadTest={booking.status !== "CANCELLED"}
          canUploadAnswer={false}
        />
      </td>
    </tr>
  );
}
