import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { sendWhatsAppReminder } from "./sms";
import { logNotification } from "./log";

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
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    booking.startAt
  );

  const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true } });
  const pairName = `${booking.student.name} & ${booking.professor.name}`;

  await Promise.all([
    notifyPerson(booking.student, { peerName: booking.professor.name, when, joinLink }, booking.id, kind),
    notifyPerson(booking.professor, { peerName: booking.student.name, when, joinLink }, booking.id, kind),
    ...admins.map((admin) => notifyPerson(admin, { peerName: pairName, when, joinLink }, booking.id, kind)),
  ]);
}

async function notifyPerson(
  person: User,
  info: { peerName: string; when: string; joinLink: string | null },
  bookingId: string,
  kind: ReminderKind
) {
  const sentence = `your Cooachly session with ${info.peerName} starts ${LABEL[kind]} (${info.when})`;
  const linkLine = info.joinLink ? `\n\nJoin here: ${info.joinLink}` : "";
  const textBody = `Reminder: ${sentence}.${linkLine}`;

  const emailHtml = `
    <p>Hi ${person.name},</p>
    <p>This is a reminder that ${sentence}.</p>
    ${info.joinLink ? `<p><a href="${info.joinLink}">Click here to join the video call</a></p>` : ""}
    <p>— Cooachly</p>
  `;

  const emailResult = await sendEmail({
    to: person.email,
    subject: `Your Cooachly session ${SUBJECT_PHRASE[kind]}`,
    html: emailHtml,
  });
  await logNotification({ bookingId, userId: person.id, channel: "EMAIL", kind, result: emailResult });

  const variables = {
    recipientName: person.name,
    peerName: info.peerName,
    label: LABEL[kind],
    when: info.when,
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
