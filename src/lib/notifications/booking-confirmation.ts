import "server-only";
import type { Booking, User } from "@prisma/client";
import { sendEmail, isEmailConfigured } from "./email";
import { logNotification } from "./log";
import { getAdminCcEmails } from "./admin-recipients";
import { formatWhenFor } from "./format";
import { SITE_CONFIG, sitePath } from "@/lib/site";
import { getAppUrl } from "@/lib/url";
import { buildIcsCalendar, googleCalendarLink, icsBookingUid } from "@/lib/ics";

type BookingWithParties = Booking & { student: User; professor: User };

function eventSummary(booking: BookingWithParties) {
  return `${booking.student.name} & ${booking.professor.name} — ${SITE_CONFIG[booking.student.site].brandName}`;
}

function sessionListHtml(bookings: BookingWithParties[], timezone: string) {
  return `<ul>${bookings
    .map((b) => {
      const joinLink = b.dailyRoomUrl || b.meetingLink;
      const calendarLink = googleCalendarLink({
        start: b.startAt,
        end: b.endAt,
        summary: eventSummary(b),
        description: joinLink ? `Join: ${joinLink}` : undefined,
        location: joinLink ?? undefined,
      });
      return `<li>${formatWhenFor(b.startAt, timezone)}${joinLink ? ` — <a href="${joinLink}">Join the session</a>` : ""} — <a href="${calendarLink}">Add to Google Calendar</a></li>`;
    })
    .join("")}</ul>`;
}

function icsAttachment(bookings: BookingWithParties[], opts: { method?: "PUBLISH" | "CANCEL"; sequence?: number } = {}) {
  const ics = buildIcsCalendar(
    bookings.map((b) => ({
      uid: icsBookingUid(b.id),
      start: b.startAt,
      end: b.endAt,
      summary: eventSummary(b),
      description: (b.dailyRoomUrl || b.meetingLink) ? `Join: ${b.dailyRoomUrl || b.meetingLink}` : undefined,
      location: b.dailyRoomUrl || b.meetingLink || undefined,
      status: opts.method === "CANCEL" ? ("CANCELLED" as const) : ("CONFIRMED" as const),
      sequence: opts.sequence,
    })),
    opts
  );
  return [{ filename: "session.ics", content: Buffer.from(ics).toString("base64"), contentType: "text/calendar" }];
}

/**
 * Sent once one or more bookings for the same student/professor pair are
 * actually confirmed (immediately for free/subscription/no-Stripe bookings,
 * or from the Stripe webhook once payment clears). Both the student and
 * professor get one email covering every session confirmed in that pass,
 * each CC'd via getAdminCcEmails() so admins see every booking as it happens.
 */
export async function sendBookingConfirmation(bookings: BookingWithParties[]) {
  if (!isEmailConfigured || bookings.length === 0) return;

  const sorted = [...bookings].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const [first] = sorted;
  const brandName = SITE_CONFIG[first.student.site].brandName;
  const countWord = sorted.length === 1 ? "session" : `${sorted.length} sessions`;
  const verb = sorted.length === 1 ? "is" : "are";

  const adminEmails = getAdminCcEmails();

  const studentResult = await sendEmail({
    to: first.student.email,
    cc: adminEmails,
    site: first.student.site,
    subject: `Your ${countWord} with ${first.professor.name} ${verb} confirmed`,
    html: `
      <p>Hi ${first.student.name},</p>
      <p>Your ${countWord} with <strong>${first.professor.name}</strong> ${verb} confirmed:</p>
      ${sessionListHtml(sorted, first.student.timezone)}
      <p>A calendar file is attached — open it to block the time, or use the "Add to Google Calendar" link above.</p>
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment(sorted),
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
    site: first.professor.site,
    subject: `${countWord === "session" ? "New session" : `${sorted.length} new sessions`} booked with ${first.student.name}`,
    html: `
      <p>Hi ${first.professor.name},</p>
      <p>Your ${countWord} with <strong>${first.student.name}</strong> ${verb} confirmed:</p>
      ${sessionListHtml(sorted, first.professor.timezone)}
      <p>A calendar file is attached — open it to block the time, or use the "Add to Google Calendar" link above.</p>
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment(sorted),
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
 * Sent when a student or professor reschedules a booking to a new time. Both
 * the student and professor get an email showing who requested it, the old
 * and new time, and their stated reason (if any) — each CC'd via
 * getAdminCcEmails(), same as a fresh booking confirmation.
 */
export async function sendBookingRescheduledEmail(
  booking: BookingWithParties,
  previousStartAt: Date,
  opts: { requestedBy: "STUDENT" | "PROFESSOR"; reason?: string } = { requestedBy: "STUDENT" }
) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const joinLink = booking.dailyRoomUrl || booking.meetingLink;
  const joinLine = joinLink ? `<p><a href="${joinLink}">Join the session</a></p>` : "";
  const calendarLink = googleCalendarLink({
    start: booking.startAt,
    end: booking.endAt,
    summary: eventSummary(booking),
    description: joinLink ? `Join: ${joinLink}` : undefined,
    location: joinLink ?? undefined,
  });
  const calendarLine = `<p>Calendar updated — a new .ics is attached, or <a href="${calendarLink}">add the new time to Google Calendar</a>.</p>`;
  const adminEmails = getAdminCcEmails();
  const requestedByName = opts.requestedBy === "STUDENT" ? booking.student.name : booking.professor.name;
  const reasonLine = opts.reason
    ? `<p><strong>Reason given:</strong> ${opts.reason}</p>`
    : "";

  const studentResult = await sendEmail({
    to: booking.student.email,
    cc: adminEmails,
    site: booking.student.site,
    subject: `Your session with ${booking.professor.name} was rescheduled`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Your session with <strong>${booking.professor.name}</strong> was moved from
      <strong>${formatWhenFor(previousStartAt, booking.student.timezone)}</strong> to
      <strong>${formatWhenFor(booking.startAt, booking.student.timezone)}</strong>, requested by ${requestedByName}.</p>
      ${reasonLine}
      ${joinLine}
      ${calendarLine}
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment([booking], { sequence: 1 }),
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
    site: booking.professor.site,
    subject: `Session with ${booking.student.name} was rescheduled`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>Your session with <strong>${booking.student.name}</strong> was moved from
      <strong>${formatWhenFor(previousStartAt, booking.professor.timezone)}</strong> to
      <strong>${formatWhenFor(booking.startAt, booking.professor.timezone)}</strong>, requested by ${requestedByName}.</p>
      ${reasonLine}
      ${joinLine}
      ${calendarLine}
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment([booking], { sequence: 1 }),
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
 * Sent to the OTHER party when a student or professor proposes moving a
 * booking to a new time — the session stays at its current time until they
 * accept. CC'd via getAdminCcEmails(), same as every other booking
 * lifecycle notification.
 */
export async function sendRescheduleProposedEmail(
  booking: BookingWithParties,
  opts: { proposedBy: "STUDENT" | "PROFESSOR"; proposedStartAt: Date; reason: string }
) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const adminEmails = getAdminCcEmails();
  const proposerName = opts.proposedBy === "STUDENT" ? booking.student.name : booking.professor.name;
  const recipient = opts.proposedBy === "STUDENT" ? booking.professor : booking.student;
  const appUrl = await getAppUrl();
  const reviewUrl = `${appUrl}${sitePath(recipient.site, recipient.id === booking.studentId ? "/student/bookings" : "/professor/bookings")}`;

  const result = await sendEmail({
    to: recipient.email,
    cc: adminEmails,
    site: recipient.site,
    subject: `${proposerName} proposed a new time for your session`,
    html: `
      <p>Hi ${recipient.name},</p>
      <p><strong>${proposerName}</strong> proposed moving your session from
      <strong>${formatWhenFor(booking.startAt, recipient.timezone)}</strong> to
      <strong>${formatWhenFor(opts.proposedStartAt, recipient.timezone)}</strong>.</p>
      <p><strong>Reason given:</strong> ${opts.reason}</p>
      <p>The session stays at its current time until you accept or decline.</p>
      <p><a href="${reviewUrl}">Review and respond</a></p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({ bookingId: booking.id, userId: recipient.id, channel: "EMAIL", kind: "reschedule_proposed", result });
}

/**
 * Sent to the proposer when their reschedule proposal is declined (by the
 * other party) or withdrawn (by themselves, in which case this is skipped —
 * see callers).
 */
export async function sendRescheduleDeclinedEmail(
  booking: BookingWithParties,
  opts: { proposedBy: "STUDENT" | "PROFESSOR"; proposedStartAt: Date; declinedByName: string }
) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const adminEmails = getAdminCcEmails();
  const proposer = opts.proposedBy === "STUDENT" ? booking.student : booking.professor;

  const result = await sendEmail({
    to: proposer.email,
    cc: adminEmails,
    site: proposer.site,
    subject: `Your proposed new time was declined`,
    html: `
      <p>Hi ${proposer.name},</p>
      <p>${opts.declinedByName} declined your proposal to move the session to
      <strong>${formatWhenFor(opts.proposedStartAt, proposer.timezone)}</strong>. The session stays at its
      current time: <strong>${formatWhenFor(booking.startAt, proposer.timezone)}</strong>.</p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({ bookingId: booking.id, userId: proposer.id, channel: "EMAIL", kind: "reschedule_declined", result });
}

/**
 * Sent when a student or professor cancels a booking, with their stated
 * reason. Both parties get an email, CC'd via getAdminCcEmails(), same as
 * every other booking lifecycle notification.
 */
export async function sendBookingCancelledEmail(
  booking: BookingWithParties,
  opts: { cancelledByName: string; reason?: string }
) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const adminEmails = getAdminCcEmails();
  const cancelledByName = opts.cancelledByName;
  const reasonLine = opts.reason ? `<p><strong>Reason given:</strong> ${opts.reason}</p>` : "";

  const whenForStudent = formatWhenFor(booking.startAt, booking.student.timezone);
  const studentResult = await sendEmail({
    to: booking.student.email,
    cc: adminEmails,
    site: booking.student.site,
    subject: `Your session with ${booking.professor.name} on ${whenForStudent} was cancelled`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Your session with <strong>${booking.professor.name}</strong> on <strong>${whenForStudent}</strong>
      has been cancelled by ${cancelledByName}.</p>
      ${reasonLine}
      <p>A calendar cancellation is attached — open it to remove the session from your calendar.</p>
      <p>If you have questions about this, please get in touch with us.</p>
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment([booking], { method: "CANCEL" }),
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "booking_cancelled",
    result: studentResult,
  });

  const whenForProfessor = formatWhenFor(booking.startAt, booking.professor.timezone);
  const professorResult = await sendEmail({
    to: booking.professor.email,
    cc: adminEmails,
    site: booking.professor.site,
    subject: `Session with ${booking.student.name} on ${whenForProfessor} was cancelled`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>The session with <strong>${booking.student.name}</strong> on <strong>${whenForProfessor}</strong>
      has been cancelled by ${cancelledByName}.</p>
      ${reasonLine}
      <p>A calendar cancellation is attached — open it to remove the session from your calendar.</p>
      <p>If you have questions about this, please get in touch with us.</p>
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment([booking], { method: "CANCEL" }),
  });
  await logNotification({
    bookingId: booking.id,
    userId: booking.professor.id,
    channel: "EMAIL",
    kind: "booking_cancelled",
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
  const adminEmails = getAdminCcEmails();

  const whenForStudent = formatWhenFor(booking.startAt, booking.student.timezone);
  const studentResult = await sendEmail({
    to: booking.student.email,
    cc: adminEmails,
    site: booking.student.site,
    subject: `Your session with ${booking.professor.name} on ${whenForStudent} was removed`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Your session with <strong>${booking.professor.name}</strong> scheduled for <strong>${whenForStudent}</strong>
      has been removed by the ${brandName} team.</p>
      <p>A calendar cancellation is attached — open it to remove the session from your calendar.</p>
      <p>If you have questions about this, please get in touch with us.</p>
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment([booking], { method: "CANCEL" }),
  });
  await logNotification({
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "booking_deleted",
    result: studentResult,
  });

  const whenForProfessor = formatWhenFor(booking.startAt, booking.professor.timezone);
  const professorResult = await sendEmail({
    to: booking.professor.email,
    cc: adminEmails,
    site: booking.professor.site,
    subject: `Session with ${booking.student.name} on ${whenForProfessor} was removed`,
    html: `
      <p>Hi ${booking.professor.name},</p>
      <p>The session with <strong>${booking.student.name}</strong> scheduled for <strong>${whenForProfessor}</strong>
      has been removed by the ${brandName} team.</p>
      <p>A calendar cancellation is attached — open it to remove the session from your calendar.</p>
      <p>If you have questions about this, please get in touch with us.</p>
      <p>— ${brandName}</p>
    `,
    attachments: icsAttachment([booking], { method: "CANCEL" }),
  });
  await logNotification({
    userId: booking.professor.id,
    channel: "EMAIL",
    kind: "booking_deleted",
    result: professorResult,
  });
}
