"use client";

import { useState, useTransition } from "react";
import type { Attachment, Booking, NotificationLog, Role, User } from "@prisma/client";
import { extendBooking, deleteBooking, markBookingCompleted } from "@/actions/bookings";
import { sendManualReminder } from "@/actions/reminders";
import { isPastDate } from "@/lib/time";
import { Badge, Button } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";
import { NotificationAddresses, DeliveryStatusBadge } from "@/components/notification-addresses";

const KIND_LABEL: Record<string, string> = {
  "24h": "24h reminder",
  "1h": "1h reminder",
  "5m": "5m reminder",
  manual: "Manual reminder",
  test: "Test",
};

export function AdminBookingRow({
  booking,
  viewerRole,
}: {
  booking: Booking & {
    student: User;
    professor: User;
    attachments: Attachment[];
    notificationLogs: NotificationLog[];
  };
  viewerRole: Role;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
  const isPast = isPastDate(booking.endAt);
  const canExtend = booking.status !== "CANCELLED" && booking.status !== "COMPLETED";
  const canRemind = booking.status !== "CANCELLED";
  const canDelete = viewerRole === "SUPERADMIN" && booking.status === "CONFIRMED";

  const failedCount = booking.notificationLogs.filter((l) => l.status === "FAILED").length;

  function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete this confirmed class (${booking.student.name} with ${booking.professor.name})? This also deletes its attachments, reviews, and reminder logs, and emails both of them (CC'd to admins) that it was removed. This cannot be undone.`
    );
    if (!confirmed) return;
    startTransition(() => {
      void deleteBooking(booking.id);
    });
  }

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
          <div className="flex flex-col items-start gap-1">
            <Badge tone={booking.status === "CANCELLED" ? "danger" : booking.status === "COMPLETED" ? "success" : "default"}>
              {booking.status}
            </Badge>
            <Badge>Pay guru directly</Badge>
            {booking.isDemo && <Badge tone="default">Free demo</Badge>}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="whitespace-nowrap text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              {showDetails ? "Hide details" : "Details"}
              {failedCount > 0 && (
                <span className="ml-1.5 inline-block rounded-full bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/40 dark:text-red-300">
                  {failedCount} failed
                </span>
              )}
            </button>
            {canDelete && (
              <Button variant="danger" disabled={isPending} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
        </td>
      </tr>
      {showDetails && (
        <tr className="border-b border-black/5 bg-black/[0.02] last:border-0 dark:border-white/5 dark:bg-white/[0.03]">
          <td colSpan={5} className="px-4 py-4">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <div className="text-xs font-semibold uppercase text-black/40 dark:text-white/40">Video call</div>
                {booking.meetingLink && booking.status !== "CANCELLED" && !isPast ? (
                  <a
                    href={booking.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
                  >
                    Join call →
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-black/40 dark:text-white/40">—</p>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-black/40 dark:text-white/40">Extend class</div>
                {canExtend ? (
                  <div className="mt-1 flex gap-2">
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
                  <p className="mt-1 text-sm text-black/40 dark:text-white/40">—</p>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-black/40 dark:text-white/40">Reminder</div>
                {canRemind ? (
                  <Button
                    variant="secondary"
                    className="mt-1"
                    disabled={isPending}
                    onClick={() => startTransition(() => sendManualReminder(booking.id))}
                  >
                    Send reminder now
                  </Button>
                ) : (
                  <p className="mt-1 text-sm text-black/40 dark:text-white/40">—</p>
                )}
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-black/40 dark:text-white/40">Files</div>
                <div className="mt-1">
                  <AttachmentPanel
                    bookingId={booking.id}
                    attachments={booking.attachments}
                    canUploadTest={booking.status !== "CANCELLED"}
                    canUploadAnswer={false}
                  />
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold uppercase text-black/40 dark:text-white/40">Completion</div>
                {canExtend ? (
                  <Button
                    variant="secondary"
                    className="mt-1"
                    disabled={isPending}
                    onClick={() => startTransition(() => markBookingCompleted(booking.id))}
                  >
                    Mark complete
                  </Button>
                ) : (
                  <p className="mt-1 text-sm text-black/40 dark:text-white/40">—</p>
                )}
              </div>
            </div>

            <div className="mt-4 border-t border-black/10 pt-3 dark:border-white/10">
              <div className="text-xs font-semibold uppercase text-black/40 dark:text-white/40">Reminder log</div>
              {booking.notificationLogs.length === 0 ? (
                <p className="mt-1 text-sm text-black/40 dark:text-white/40">No reminders sent yet.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {booking.notificationLogs.map((log) => (
                    <div key={log.id} className="flex flex-wrap items-center gap-2 text-xs">
                      <Badge tone={log.status === "SENT" ? "success" : log.status === "FAILED" ? "danger" : "default"}>
                        {log.status}
                      </Badge>
                      <span className="font-medium">{KIND_LABEL[log.kind] ?? log.kind}</span>
                      <span className="text-black/50 dark:text-white/50">{log.channel}</span>
                      <NotificationAddresses log={log} />
                      <DeliveryStatusBadge log={log} />
                      <span className="text-black/40 dark:text-white/40">
                        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
                      </span>
                      {log.error && <span className="text-red-600 dark:text-red-400">— {log.error}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
