"use client";

import { useState, useTransition } from "react";
import type { Booking, User } from "@prisma/client";
import { cancelBooking, markBookingCompleted, setMeetingLink } from "@/actions/bookings";
import { Badge, Button, Input } from "@/components/ui";

export function ProfessorBookingRow({ booking, isPast }: { booking: Booking & { student: User }; isPast: boolean }) {
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
