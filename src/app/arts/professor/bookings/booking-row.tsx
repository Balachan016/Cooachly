"use client";

import { useState, useTransition } from "react";
import type { Attachment, Booking, Review, StudentProfile, User } from "@prisma/client";
import { markBookingCompleted, setMeetingLink } from "@/actions/bookings";
import { Badge, Button, Input } from "@/components/ui";
import { AttachmentPanel } from "@/components/attachment-panel";
import { ReviewForm } from "@/components/review-form";
import { RescheduleControl } from "@/components/reschedule-control";
import { CancelBookingControl } from "@/components/cancel-booking-control";

export function ProfessorBookingRow({
  booking,
  isPast,
  canJoin,
}: {
  booking: Booking & {
    student: User & { studentProfile: StudentProfile | null };
    attachments: Attachment[];
    reviews: Review[];
  };
  isPast: boolean;
  canJoin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [showDetails, setShowDetails] = useState(false);
  const [link, setLink] = useState(booking.meetingLink ?? "");
  const myReview = booking.reviews.find((r) => r.raterId === booking.professorId);
  const canModify = booking.status !== "CANCELLED" && !isPast && booking.status !== "COMPLETED";
  const detailsLabel = !booking.meetingLink && booking.status !== "CANCELLED" ? "Add call link" : showDetails ? "Hide details" : "Details";

  return (
    <div className="px-4 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-medium">{booking.student.name}</span>
        <span className="text-sm text-black/50 dark:text-white/50">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startAt)}
        </span>
        <Badge tone={booking.status === "CANCELLED" ? "danger" : booking.status === "COMPLETED" ? "success" : "default"}>
          {booking.status}
        </Badge>
        <Badge>Pay guru directly</Badge>
        {booking.isDemo && <Badge tone="default">Free demo</Badge>}
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
          {isPast && booking.status !== "CANCELLED" && booking.status !== "COMPLETED" && (
            <Button disabled={isPending} onClick={() => startTransition(() => markBookingCompleted(booking.id))}>
              Mark complete
            </Button>
          )}
          {booking.status === "CANCELLED" && (
            <Button disabled={isPending} onClick={() => startTransition(() => markBookingCompleted(booking.id))}>
              Mark complete (undo cancel)
            </Button>
          )}
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            {detailsLabel}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-2 space-y-2 border-t border-black/5 pt-2 dark:border-white/5">
          {booking.student.studentProfile && (
            <p className="text-xs text-black/50 dark:text-white/50">
              {booking.student.studentProfile.country}
              {booking.student.studentProfile.curriculumLevel ? ` · ${booking.student.studentProfile.curriculumLevel}` : ""}
              {booking.student.studentProfile.curriculum ? ` · ${booking.student.studentProfile.curriculum}` : ""}
              {booking.student.studentProfile.grade ? ` · Grade ${booking.student.studentProfile.grade}` : ""}
              {booking.student.studentProfile.syllabusFileUrl && (
                <>
                  {" · "}
                  <a
                    href={booking.student.studentProfile.syllabusFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-brand-700 hover:underline dark:text-brand-400"
                  >
                    Syllabus
                  </a>
                </>
              )}
            </p>
          )}
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
            </div>
          )}
          {booking.meetingLink && booking.status !== "CANCELLED" && !canJoin && !isPast && (
            <p className="text-sm text-black/40 dark:text-white/40">Join link opens 5 minutes before the class.</p>
          )}
          {booking.status !== "CANCELLED" && (
            <AttachmentPanel
              bookingId={booking.id}
              attachments={booking.attachments}
              canUploadTest={true}
              canUploadAnswer={false}
            />
          )}
          {booking.status === "COMPLETED" && (
            <ReviewForm
              bookingId={booking.id}
              revieweeLabel={booking.student.name}
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
