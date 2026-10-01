import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "./email";
import { logNotification } from "./log";
import { SITE_CONFIG } from "@/lib/site";

type BookingWithParties = Booking & { student: User; professor: User };

/**
 * Sent once a booking is actually confirmed (immediately for free/subscription/
 * no-Stripe bookings, or from the Stripe webhook once payment clears). Both
 * the student and professor get their own email, each CC'd to every active
 * admin on that site so admins see every booking as it happens.
 */
export async function sendBookingConfirmation(booking: BookingWithParties) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startAt);
  const joinLink = booking.dailyRoomUrl || booking.meetingLink;
  const joinLine = joinLink ? `<p><a href="${joinLink}">Join the session</a></p>` : "";

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, site: booking.professor.site },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email);

  const studentResult = await sendEmail({
    to: booking.student.email,
    cc: adminEmails,
    subject: `Your ${brandName} session with ${booking.professor.name} is confirmed`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Your session with <strong>${booking.professor.name}</strong> is confirmed for <strong>${when}</strong>.</p>
      ${joinLine}
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "booking_confirmation",
    result: studentResult,
  });

  const professorResult = await sendEmail({
    to: booking.professor.email,
    cc: adminEmails,
    subject: `New ${brandName} session booked with ${booking.student.name}`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>A session with <strong>${booking.student.name}</strong> is confirmed for <strong>${when}</strong>.</p>
      ${joinLine}
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.professor.id,
    channel: "EMAIL",
    kind: "booking_confirmation",
    result: professorResult,
  });
}
