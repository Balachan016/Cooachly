import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { sendWhatsAppReminder } from "./sms";
import { sendPushToUser } from "./push";
import { logNotification } from "./log";
import { formatWhenFor } from "./format";
import { SITE_CONFIG, sitePath } from "@/lib/site";

// Where tapping a reminder push takes each role. Superadmin's dashboard is
// cross-site, so its path is never site-prefixed.
function bookingsPath(person: User): string {
  switch (person.role) {
    case "SUPERADMIN":
      return "/superadmin/bookings";
    case "ADMIN":
      return sitePath(person.site, "/admin/bookings");
    case "PROFESSOR":
      return sitePath(person.site, "/professor/bookings");
    case "STUDENT":
      return sitePath(person.site, "/student/bookings");
  }
}

export type ReminderKind = "24h" | "1h" | "5m" | "manual" | "instant";

const LABEL: Record<ReminderKind, string> = {
  "24h": "in 1 day",
  "1h": "in 1 hour",
  "5m": "in 5 minutes",
  manual: "as scheduled",
  instant: "now",
};

const SUBJECT_PHRASE: Record<ReminderKind, string> = {
  "24h": "starts in 1 day",
  "1h": "starts in 1 hour",
  "5m": "starts in 5 minutes",
  manual: "is coming up",
  instant: "is starting now",
};

type BookingWithParties = Booking & { student: User; professor: User };

export async function sendBookingReminder(booking: BookingWithParties, kind: ReminderKind) {
  const joinLink = booking.dailyRoomUrl || booking.meetingLink;

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, site: booking.professor.site },
  });
  const pairName = `${booking.student.name} & ${booking.professor.name}`;

  await Promise.all([
    notifyPerson(booking.student, { peerName: booking.professor.name, startAt: booking.startAt, joinLink }, booking.id, kind),
    notifyPerson(booking.professor, { peerName: booking.student.name, startAt: booking.startAt, joinLink }, booking.id, kind),
    ...admins.map((admin) => notifyPerson(admin, { peerName: pairName, startAt: booking.startAt, joinLink }, booking.id, kind)),
  ]);
}

async function notifyPerson(
  person: User,
  info: { peerName: string; startAt: Date; joinLink: string | null },
  bookingId: string,
  kind: ReminderKind
) {
  // Formatted in this specific person's own timezone — not the peer's, and
  // not the server's runtime default, which have no relation to what time
  // this person's clock actually shows.
  const when = formatWhenFor(info.startAt, person.timezone);
  const brandName = SITE_CONFIG[person.site].brandName;
  const sentence = `your ${brandName} session with ${info.peerName} starts ${LABEL[kind]} (${when})`;
  const linkLine = info.joinLink ? `\n\nJoin here: ${info.joinLink}` : "";
  const textBody = `Reminder: ${sentence}.${linkLine}`;

  const emailHtml = `
    <p>Hi ${person.name},</p>
    <p>This is a reminder that ${sentence}.</p>
    ${info.joinLink ? `<p><a href="${info.joinLink}">Click here to join the video call</a></p>` : ""}
    <p>— ${brandName}</p>
  `;

  const emailResult = await sendEmail({
    to: person.email,
    subject: `Your ${brandName} session ${SUBJECT_PHRASE[kind]}`,
    html: emailHtml,
  });
  await logNotification({ bookingId, userId: person.id, channel: "EMAIL", kind, result: emailResult });

  // Push goes to every device the person enabled notifications on (installed
  // app or browser). Right before (or at) the session, tapping it opens the call.
  const opensCall = (kind === "5m" || kind === "instant") && info.joinLink;
  const pushResult = await sendPushToUser(person.id, {
    title: `Your ${brandName} session ${SUBJECT_PHRASE[kind]}`,
    body: `With ${info.peerName} — ${when}`,
    url: opensCall ? info.joinLink! : bookingsPath(person),
    tag: `booking-${bookingId}`,
  });
  if (!pushResult.skipped) {
    await logNotification({ bookingId, userId: person.id, channel: "PUSH", kind, result: pushResult });
  }

  const variables = {
    recipientName: person.name,
    peerName: info.peerName,
    label: LABEL[kind],
    when,
    joinLink: info.joinLink ?? "",
  };

  if (person.phone) {
    const waResult = await sendWhatsAppReminder({ to: person.phone, body: textBody, variables });
    await logNotification({ bookingId, userId: person.id, channel: "WHATSAPP", kind, result: waResult });
  }

  // Also notify a parent/guardian's WhatsApp number, if one is on file.
  if (person.parentPhone) {
    const parentResult = await sendWhatsAppReminder({ to: person.parentPhone, body: textBody, variables });
    await logNotification({ bookingId, userId: person.id, channel: "WHATSAPP", kind, result: parentResult });
  }
}
