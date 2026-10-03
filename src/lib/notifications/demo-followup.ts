import "server-only";
import type { Booking, User } from "@prisma/client";
import { sendEmail } from "./email";
import { logNotification } from "./log";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { getAppUrl } from "@/lib/url";

type BookingWithParties = Booking & { student: User; professor: User };

export async function sendDemoFollowUpEmail(booking: BookingWithParties) {
  const brandName = SITE_CONFIG[booking.student.site].brandName;
  const appUrl = await getAppUrl();
  const contactUrl = `${appUrl}${sitePath(booking.student.site, "/contact")}`;

  const result = await sendEmail({
    to: booking.student.email,
    site: booking.student.site,
    subject: `How was your ${brandName} demo?`,
    html: `
      <p>Hi ${booking.student.name},</p>
      <p>Thanks for attending your free demo session with <strong>${booking.professor.name}</strong>! We hope it was a great first step.</p>
      <p>If you'd like to continue with regular sessions, just reply to this email or <a href="${contactUrl}">get in touch with us</a> to confirm — we'll take care of setting up your account and getting your schedule going.</p>
      <p>— ${brandName}</p>
    `,
  });

  await logNotification({
    bookingId: booking.id,
    userId: booking.student.id,
    channel: "EMAIL",
    kind: "demo_followup",
    result,
  });
}
