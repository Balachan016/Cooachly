"use client";

import { useState } from "react";
import type { Attachment, Booking, Review, User } from "@prisma/client";
import { Badge } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";
import { ReviewForm } from "@/components/review-form";
import { RescheduleControl } from "@/components/reschedule-control";
import { CancelBookingControl } from "@/components/cancel-booking-control";

export function StudentBookingRow({
  booking,
  isPast,
  canJoin,
}: {
  booking: Booking & { professor: User; attachments: Attachment[]; reviews: Review[] };
  isPast: boolean;
  canJoin: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const myReview = booking.reviews.find((r) => r.raterId === booking.studentId);
  const canModify = !isPast && booking.status !== "CANCELLED" && booking.status !== "COMPLETED";
  const hasDetails = booking.status !== "CANCELLED" || booking.attachments.length > 0;

  return (
    <div className="px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{booking.professor.name}</span>
        <span className="text-sm text-black/50 dark:text-white/50">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startAt)}
        </span>
        <Badge tone={booking.status === "CANCELLED" ? "danger" : booking.status === "COMPLETED" ? "success" : "default"}>
          {booking.status}
        </Badge>
        <Badge tone={booking.paymentStatus === "UNPAID" ? "warning" : "success"}>{booking.paymentStatus}</Badge>
        {canJoin && booking.meetingLink && (
          <a
            href={booking.meetingLink}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Join video call →
          </a>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canModify && (
            <>
              <CancelBookingControl bookingId={booking.id} />
              <RescheduleControl bookingId={booking.id} />
            </>
          )}
          {hasDetails && (
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              {showDetails ? "Hide details" : "Details"}
            </button>
          )}
        </div>
      </div>

      {showDetails && hasDetails && (
        <div className="mt-2 border-t border-black/5 pt-2 dark:border-white/5">
          {booking.meetingLink && booking.status !== "CANCELLED" && !canJoin && !isPast && (
            <p className="text-sm text-black/40 dark:text-white/40">Join link opens 5 minutes before your session.</p>
          )}
          {booking.status !== "CANCELLED" && (
            <AttachmentPanel
              bookingId={booking.id}
              attachments={booking.attachments}
              canUploadTest={false}
              canUploadAnswer={true}
            />
          )}
          {booking.status === "COMPLETED" && (
            <ReviewForm
              bookingId={booking.id}
              revieweeLabel={booking.professor.name}
              existingRating={myReview?.rating}
              existingComment={myReview?.comment}
              existingJoinedOnTime={myReview?.joinedOnTime}
              existingExplainedClearly={myReview?.explainedClearly}
              existingStayedOnTopic={myReview?.stayedOnTopic}
            />
          )}
        </div>
      )}
    </div>
  );
}
