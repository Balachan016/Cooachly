"use client";

import { useTransition } from "react";
import type { Attachment, Booking, User } from "@prisma/client";
import { cancelBooking } from "@/actions/bookings";
import { Badge, Button } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";

export function StudentBookingRow({
  booking,
  isPast,
  canJoin,
}: {
  booking: Booking & { professor: User; attachments: Attachment[] };
  isPast: boolean;
  canJoin: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{booking.professor.name}</div>
        <div className="text-sm text-black/50 dark:text-white/50">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startAt)}
        </div>
        <div className="mt-1 flex gap-2">
          <Badge tone={booking.status === "CANCELLED" ? "danger" : booking.status === "COMPLETED" ? "success" : "default"}>
            {booking.status}
          </Badge>
          <Badge tone={booking.paymentStatus === "UNPAID" ? "warning" : "success"}>{booking.paymentStatus}</Badge>
        </div>
        {booking.meetingLink && booking.status !== "CANCELLED" && (
          canJoin ? (
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-green-700 hover:underline dark:text-green-400"
            >
              Join video call →
            </a>
          ) : (
            !isPast && (
              <p className="mt-2 text-sm text-black/40 dark:text-white/40">
                Join link opens 5 minutes before your session.
              </p>
            )
          )
        )}
        {booking.status !== "CANCELLED" && (
          <AttachmentPanel
            bookingId={booking.id}
            attachments={booking.attachments}
            canUploadTest={false}
            canUploadAnswer={true}
          />
        )}
      </div>

      {!isPast && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
        <Button variant="danger" disabled={isPending} onClick={() => startTransition(() => cancelBooking(booking.id))}>
          Cancel
        </Button>
      )}
    </div>
  );
}
