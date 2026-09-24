import "server-only";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "./email";
import { sendWhatsAppReminder } from "./sms";
import { logNotification } from "./log";
import { SITE_CONFIG } from "@/lib/site";

export type ReminderKind = "24h" | "1h" | "5m" | "manual";

const RELATIVE_LABEL: Record<Exclude<ReminderKind, "manual">, string> = {
  "24h": "in 1 day",
  "1h": "in 1 hour",
  "5m": "in 5 minutes",
};

function reminderSentence(kind: ReminderKind, brandName: string, peerName: string, when: string) {
  if (kind === "manual") {
    return `your ${brandName} session with ${peerName} is scheduled for ${when}`;
  }
  return `your ${brandName} session with ${peerName} starts ${RELATIVE_LABEL[kind]} (${when})`;
}

type BookingWithParties = Booking & { student: User; professor: User };

export async function sendBookingReminder(booking: BookingWithParties, kind: ReminderKind) {
  const joinLink = booking.dailyRoomUrl || booking.meetingLink;
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    booking.startAt
  );

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, site: booking.professor.site },
  });
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
  const brandName = SITE_CONFIG[person.site].brandName;
  const sentence = reminderSentence(kind, brandName, info.peerName, info.when);
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
    subject:
      kind === "manual" ? `Your upcoming ${brandName} session` : `Your ${brandName} session starts ${RELATIVE_LABEL[kind]}`,
    html: emailHtml,
  });
  await logNotification({ bookingId, userId: person.id, channel: "EMAIL", kind, result: emailResult });

  const variables = {
    recipientName: person.name,
    peerName: info.peerName,
    label: kind === "manual" ? "as scheduled" : RELATIVE_LABEL[kind],
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
