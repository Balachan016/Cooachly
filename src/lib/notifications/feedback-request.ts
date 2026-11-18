import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendWhatsAppFeedbackRequest } from "./sms";
import { logNotification } from "./log";
import { sitePath } from "@/lib/site";
import { getAppUrl } from "@/lib/url";

type BookingWithParties = Booking & { student: User; professor: User };

/**
 * Prompts both sides for structured post-call feedback once a (non-demo)
 * session wraps up — a session only ever becomes COMPLETED once, so this is
 * called right alongside that transition rather than on a schedule. Demo
 * calls get their own different follow-up (see demo-followup.ts).
 *
 * Sent via WhatsApp/SMS, not email — this used to be an email-only prompt;
 * moved here specifically to cut down on email volume. Skipped entirely for
 * anyone with no phone number on file, same as every other WhatsApp/SMS-only
 * notification in this app (reminders still go out by email, which is why
 * those keep an always-works-for-everyone email leg; this one doesn't).
 */
export async function sendFeedbackRequest(booking: BookingWithParties) {
  if (booking.isDemo || booking.feedbackRequestSentAt) return;

  const appUrl = await getAppUrl();

  if (booking.student.isActive && booking.student.phone) {
    const feedbackUrl = `${appUrl}${sitePath(booking.student.site, "/student/bookings")}`;
    const results = await sendWhatsAppFeedbackRequest({
      to: booking.student.phone,
      body: `Hi ${booking.student.name}, thanks for attending your session with ${booking.professor.name}! We'd love to hear how it went — share your feedback here: ${feedbackUrl}`,
      variables: { recipientName: booking.student.name, peerName: booking.professor.name, feedbackUrl },
    });
    await Promise.all(
      results.map((result) =>
        logNotification({ bookingId: booking.id, userId: booking.student.id, channel: result.channel, kind: "feedback_request", result })
      )
    );
  }

  if (booking.professor.isActive && booking.professor.phone) {
    const feedbackUrl = `${appUrl}${sitePath(booking.professor.site, "/professor/bookings")}`;
    const results = await sendWhatsAppFeedbackRequest({
      to: booking.professor.phone,
      body: `Hi ${booking.professor.name}, thanks for teaching your session with ${booking.student.name}! Please share a quick bit of feedback: ${feedbackUrl}`,
      variables: { recipientName: booking.professor.name, peerName: booking.student.name, feedbackUrl },
    });
    await Promise.all(
      results.map((result) =>
        logNotification({ bookingId: booking.id, userId: booking.professor.id, channel: result.channel, kind: "feedback_request", result })
      )
    );
  }

  await prisma.booking.update({ where: { id: booking.id }, data: { feedbackRequestSentAt: new Date() } });
}
