"use client";

import { useState, useTransition } from "react";
import type { Attachment, Booking, User } from "@prisma/client";
import { cancelBooking, markBookingCompleted, setMeetingLink } from "@/actions/bookings";
import { Badge, Button, Input } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";

export function ProfessorBookingRow({
  booking,
  isPast,
  canJoin,
}: {
  booking: Booking & { student: User; attachments: Attachment[] };
  isPast: boolean;
  canJoin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [link, setLink] = useState(booking.meetingLink ?? "");

  return (
    <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="font-medium">{booking.student.name}</div>
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
                Join link opens 5 minutes before the session.
              </p>
            )
          )
        )}
        {booking.status !== "CANCELLED" && (
          <AttachmentPanel
            bookingId={booking.id}
            attachments={booking.attachments}
            canUploadTest={true}
            canUploadAnswer={false}
          />
        )}
      </div>

      {booking.status !== "CANCELLED" && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            placeholder="Video call link (Zoom, Meet…)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="sm:w-64"
          />
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => startTransition(() => setMeetingLink(booking.id, link))}
          >
            Save link
          </Button>
          {!isPast && booking.status !== "COMPLETED" && (
            <Button
              variant="danger"
              disabled={isPending}
              onClick={() => startTransition(() => cancelBooking(booking.id))}
            >
              Cancel
            </Button>
          )}
          {isPast && booking.status !== "COMPLETED" && (
            <Button disabled={isPending} onClick={() => startTransition(() => markBookingCompleted(booking.id))}>
              Mark complete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
