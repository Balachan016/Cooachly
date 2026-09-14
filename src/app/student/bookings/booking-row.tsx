"use client";

import { useTransition } from "react";
import type { Booking, User } from "@prisma/client";
import { cancelBooking } from "@/actions/bookings";
import { Badge, Button } from "@/components/ui";

export function StudentBookingRow({ booking, isPast }: { booking: Booking & { professor: User }; isPast: boolean }) {
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
          <a
            href={booking.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm font-medium text-green-700 hover:underline dark:text-green-400"
          >
            Join video call →
          </a>
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
