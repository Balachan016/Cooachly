import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "./email";
import { logNotification } from "./log";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { getAppUrl } from "@/lib/url";

type BookingWithParties = Booking & { student: User; professor: User };

/**
 * Prompts both sides for structured post-call feedback once a (non-demo)
 * session wraps up — a session only ever becomes COMPLETED once, so this is
 * called right alongside that transition rather than on a schedule. Demo
 * calls get their own different follow-up (see demo-followup.ts).
 */
export async function sendFeedbackRequestEmails(booking: BookingWithParties) {
  if (booking.isDemo || booking.feedbackRequestSentAt) return;
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const appUrl = await getAppUrl();

  const studentResult = await sendEmail({
    to: booking.student.email,
    site: booking.student.site,
    subject: `How was your session with ${booking.professor.name}?`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Thanks for attending your session with <strong>${booking.professor.name}</strong>! We'd love to hear how it went —
      it only takes a moment and helps us keep every session great.</p>
      <p><a href="${appUrl}${sitePath(booking.student.site, "/student/bookings")}">Share your feedback</a></p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "feedback_request",
    result: studentResult,
  });

  const professorResult = await sendEmail({
    to: booking.professor.email,
    site: booking.professor.site,
    subject: `How was your session with ${booking.student.name}?`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>Thanks for teaching your session with <strong>${booking.student.name}</strong>! Please share a quick bit of
      feedback about how it went.</p>
      <p><a href="${appUrl}${sitePath(booking.professor.site, "/professor/bookings")}">Share your feedback</a></p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.professor.id,
    channel: "EMAIL",
    kind: "feedback_request",
    result: professorResult,
  });

  await prisma.booking.update({ where: { id: booking.id }, data: { feedbackRequestSentAt: new Date() } });
}
