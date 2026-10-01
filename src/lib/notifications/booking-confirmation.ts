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

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, site: first.professor.site },
    select: { email: true },
  });
  const adminEmails = admins.map((a) => a.email);

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
