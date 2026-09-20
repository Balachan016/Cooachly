import "server-only";
import type { Booking, User } from "@prisma/client";
import { sendEmail } from "./email";
import { sendWhatsAppReminder } from "./sms";
import { logNotification } from "./log";
import { SITE_CONFIG } from "@/lib/site";

export type ReminderKind = "24h" | "1h" | "5m";

const KIND_LABEL: Record<ReminderKind, string> = {
  "24h": "in 1 day",
  "1h": "in 1 hour",
  "5m": "in 5 minutes",
};

type BookingWithParties = Booking & { student: User; professor: User };

export async function sendBookingReminder(booking: BookingWithParties, kind: ReminderKind) {
  const joinLink = booking.dailyRoomUrl || booking.meetingLink;
  const label = KIND_LABEL[kind];
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    booking.startAt
  );

  await Promise.all([
    notifyPerson(
      booking.student,
      { peerName: booking.professor.name, label, when, joinLink },
      booking.id,
      kind
    ),
    notifyPerson(
      booking.professor,
      { peerName: booking.student.name, label, when, joinLink },
      booking.id,
      kind
    ),
  ]);
}

async function notifyPerson(
  person: User,
  info: { peerName: string; label: string; when: string; joinLink: string | null },
  bookingId: string,
  kind: ReminderKind
) {
  const brandName = SITE_CONFIG[person.site].brandName;
  const linkLine = info.joinLink ? `\n\nJoin here: ${info.joinLink}` : "";
  const textBody = `Reminder: your ${brandName} session with ${info.peerName} starts ${info.label} (${info.when}).${linkLine}`;

  const emailHtml = `
    <p>Hi ${person.name},</p>
    <p>This is a reminder that your ${brandName} session with <strong>${info.peerName}</strong> starts <strong>${info.label}</strong> (${info.when}).</p>
    ${info.joinLink ? `<p><a href="${info.joinLink}">Click here to join the video call</a></p>` : ""}
    <p>— ${brandName}</p>
  `;

  const emailResult = await sendEmail({
    to: person.email,
    subject: `Your ${brandName} session starts ${info.label}`,
    html: emailHtml,
  });
  await logNotification({ bookingId, userId: person.id, channel: "EMAIL", kind, result: emailResult });

  const variables = {
    recipientName: person.name,
    peerName: info.peerName,
    label: info.label,
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
