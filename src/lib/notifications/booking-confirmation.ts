import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "./email";
import { logNotification } from "./log";
import { SITE_CONFIG } from "@/lib/site";

type BookingWithParties = Booking & { student: User; professor: User };

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function sessionListHtml(bookings: BookingWithParties[]) {
  return `<ul>${bookings
    .map((b) => {
      const joinLink = b.dailyRoomUrl || b.meetingLink;
      return `<li>${formatWhen(b.startAt)}${joinLink ? ` — <a href="${joinLink}">Join the session</a>` : ""}</li>`;
    })
    .join("")}</ul>`;
}

async function getAdminEmails(site: BookingWithParties["professor"]["site"]) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, site },
    select: { email: true },
  });
  return admins.map((a) => a.email);
}

/**
 * Sent once one or more bookings for the same student/professor pair are
 * actually confirmed (immediately for free/subscription/no-Stripe bookings,
 * or from the Stripe webhook once payment clears). Both the student and
 * professor get one email covering every session confirmed in that pass,
 * each CC'd to every active admin on that site so admins see every booking
 * as it happens.
 */
export async function sendBookingConfirmation(bookings: BookingWithParties[]) {
  if (!isEmailConfigured || bookings.length === 0) return;

  const sorted = [...bookings].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const [first] = sorted;
  const brandName = SITE_CONFIG[first.student.site].brandName;
  const countWord = sorted.length === 1 ? "session" : `${sorted.length} sessions`;
  const verb = sorted.length === 1 ? "is" : "are";
  const listHtml = sessionListHtml(sorted);

  const adminEmails = await getAdminEmails(first.professor.site);

  const studentResult = await sendEmail({
    to: first.student.email,
    cc: adminEmails,
    subject: `Your ${countWord} with ${first.professor.name} ${verb} confirmed`,
    html: `
      <p>Hi ${first.student.name},</p>
      <p>Your ${countWord} with <strong>${first.professor.name}</strong> ${verb} confirmed:</p>
      ${listHtml}
      <p>— ${brandName}</p>
    `,
  });
  for (const booking of sorted) {
    await logNotification({
      bookingId: booking.id,
      userId: booking.student.id,
      channel: "EMAIL",
      kind: "booking_confirmation",
      result: studentResult,
    });
  }

  const professorResult = await sendEmail({
    to: first.professor.email,
    cc: adminEmails,
    subject: `${countWord === "session" ? "New session" : `${sorted.length} new sessions`} booked with ${first.student.name}`,
    html: `
      <p>Hi ${first.professor.name},</p>
      <p>Your ${countWord} with <strong>${first.student.name}</strong> ${verb} confirmed:</p>
      ${listHtml}
      <p>— ${brandName}</p>
    `,
  });
  for (const booking of sorted) {
    await logNotification({
      bookingId: booking.id,
      userId: booking.professor.id,
      channel: "EMAIL",
      kind: "booking_confirmation",
      result: professorResult,
    });
  }
}

/**
 * Sent when a student reschedules a booking to a new time. Both the student
 * and professor get an email showing the old and new time, each CC'd to
 * every active admin on that site, same as a fresh booking confirmation.
 */
export async function sendBookingRescheduledEmail(booking: BookingWithParties, previousStartAt: Date) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const joinLink = booking.dailyRoomUrl || booking.meetingLink;
  const joinLine = joinLink ? `<p><a href="${joinLink}">Join the session</a></p>` : "";
  const adminEmails = await getAdminEmails(booking.professor.site);

  const studentResult = await sendEmail({
    to: booking.student.email,
    cc: adminEmails,
    subject: `Your session with ${booking.professor.name} was rescheduled`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Your session with <strong>${booking.professor.name}</strong> was moved from
      <strong>${formatWhen(previousStartAt)}</strong> to <strong>${formatWhen(booking.startAt)}</strong>.</p>
      ${joinLine}
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "booking_rescheduled",
    result: studentResult,
  });

  const professorResult = await sendEmail({
    to: booking.professor.email,
    cc: adminEmails,
    subject: `${booking.student.name} rescheduled their session with you`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>Your session with <strong>${booking.student.name}</strong> was moved from
      <strong>${formatWhen(previousStartAt)}</strong> to <strong>${formatWhen(booking.startAt)}</strong>.</p>
      ${joinLine}
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.professor.id,
    channel: "EMAIL",
    kind: "booking_rescheduled",
    result: professorResult,
  });
}

/**
 * Sent after a superadmin permanently deletes a confirmed booking. The
 * booking row is already gone by the time this runs, so these logs aren't
 * tied back to a bookingId (there's nothing left to cascade from).
 */
export async function sendBookingDeletedEmail(booking: BookingWithParties) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const when = formatWhen(booking.startAt);
  const adminEmails = await getAdminEmails(booking.professor.site);

  const studentResult = await sendEmail({
    to: booking.student.email,
    cc: adminEmails,
    subject: `Your session with ${booking.professor.name} on ${when} was removed`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Your session with <strong>${booking.professor.name}</strong> scheduled for <strong>${when}</strong>
      has been removed by the ${brandName} team.</p>
      <p>If you have questions about this, please get in touch with us.</p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "booking_deleted",
    result: studentResult,
  });

  const professorResult = await sendEmail({
    to: booking.professor.email,
    cc: adminEmails,
    subject: `Session with ${booking.student.name} on ${when} was removed`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>The session with <strong>${booking.student.name}</strong> scheduled for <strong>${when}</strong>
      has been removed by the ${brandName} team.</p>
      <p>If you have questions about this, please get in touch with us.</p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({
    userId: booking.professor.id,
    channel: "EMAIL",
    kind: "booking_deleted",
    result: professorResult,
  });
}
