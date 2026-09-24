"use client";

import { useState, useTransition } from "react";
import type { Attachment, Booking, NotificationLog, User } from "@prisma/client";
import { extendBooking } from "@/actions/bookings";
import { isPastDate } from "@/lib/time";
import { Badge, Button } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";

const KIND_LABEL: Record<string, string> = { "24h": "24h reminder", "1h": "1h reminder", "5m": "5m reminder", test: "Test" };

export function AdminBookingRow({
  booking,
}: {
  booking: Booking & {
    student: User;
    professor: User;
    attachments: Attachment[];
    notificationLogs: NotificationLog[];
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [showReminders, setShowReminders] = useState(false);
  const isPast = isPastDate(booking.endAt);
  const canExtend = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";

  const failedCount = booking.notificationLogs.filter((l) => l.status === "FAILED").length;
  const sentCount = booking.notificationLogs.filter((l) => l.status === "SENT").length;

  return (
    <>
    <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
      <td className="whitespace-nowrap px-4 py-3">
        <div className="font-medium">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(booking.startAt)}
        </div>
        <div className="text-xs text-black/50 dark:text-white/50">
          {new Intl.DateTimeFormat("en-US", { timeStyle: "short" }).format(booking.startAt)}
        </div>
      </td>
      <td className="px-4 py-3">{booking.student.name}</td>
      <td className="px-4 py-3">{booking.professor.name}</td>
      <td className="px-4 py-3">
        <Badge tone={booking.status === "CANCELLED" ? "danger" : booking.status === "COMPLETED" ? "success" : "default"}>
          {booking.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge>Pay guru directly</Badge>
      </td>
      <td className="px-4 py-3">
        {booking.meetingLink && booking.status !== "CANCELLED" && !isPast ? (
          <a
            href={booking.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-brand-700 hover:underline dark:text-brand-400"
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
      <td className="px-4 py-3">
        {booking.notificationLogs.length === 0 ? (
          <span className="text-black/30 dark:text-white/30">—</span>
        ) : (
          <button
            type="button"
            onClick={() => setShowReminders((v) => !v)}
            className="text-left text-xs font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            {sentCount} sent{failedCount > 0 ? `, ${failedCount} failed` : ""} — {showReminders ? "hide" : "view"}
          </button>
        )}
      </td>
    </tr>
    {showReminders && booking.notificationLogs.length > 0 && (
      <tr className="border-b border-black/5 bg-black/[0.02] last:border-0 dark:border-white/5 dark:bg-white/[0.03]">
        <td colSpan={9} className="px-4 py-3">
          <div className="space-y-1.5">
            {booking.notificationLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone={log.status === "SENT" ? "success" : log.status === "FAILED" ? "danger" : "default"}>
                  {log.status}
                </Badge>
                <span className="font-medium">{KIND_LABEL[log.kind] ?? log.kind}</span>
                <span className="text-black/50 dark:text-white/50">{log.channel}</span>
                <span className="text-black/40 dark:text-white/40">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
                </span>
                {log.error && <span className="text-red-600 dark:text-red-400">— {log.error}</span>}
              </div>
            ))}
          </div>
        </td>
      </tr>
    )}
    </>
  );
}
