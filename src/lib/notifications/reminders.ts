import "server-only";
import type { Booking, User } from "@prisma/client";
import { sendEmail } from "./email";
import { sendWhatsApp } from "./sms";

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
    notifyPerson(booking.student, {
      peerName: booking.professor.name,
      label,
      when,
      joinLink,
    }),
    notifyPerson(booking.professor, {
      peerName: booking.student.name,
      label,
      when,
      joinLink,
    }),
  ]);
}

async function notifyPerson(
  person: User,
  info: { peerName: string; label: string; when: string; joinLink: string | null }
) {
  const linkLine = info.joinLink ? `\n\nJoin here: ${info.joinLink}` : "";
  const textBody = `Reminder: your Cooachly session with ${info.peerName} starts ${info.label} (${info.when}).${linkLine}`;

  const emailHtml = `
    <p>Hi ${person.name},</p>
    <p>This is a reminder that your Cooachly session with <strong>${info.peerName}</strong> starts <strong>${info.label}</strong> (${info.when}).</p>
    ${info.joinLink ? `<p><a href="${info.joinLink}">Click here to join the video call</a></p>` : ""}
    <p>— Cooachly</p>
  `;

  const tasks: Promise<unknown>[] = [
    sendEmail({ to: person.email, subject: `Your Cooachly session starts ${info.label}`, html: emailHtml }),
  ];

  if (person.phone) {
    tasks.push(sendWhatsApp({ to: person.phone, body: textBody }));
  }

  // Also notify a parent/guardian's WhatsApp number, if one is on file.
  if (person.parentPhone) {
    tasks.push(sendWhatsApp({ to: person.parentPhone, body: textBody }));
  }

  await Promise.all(tasks);
}
