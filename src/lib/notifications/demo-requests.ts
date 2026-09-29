import "server-only";
import type { DemoRequest, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "./email";
import { SITE_CONFIG } from "@/lib/site";

export async function sendDemoRequestScheduledEmail(demoRequest: DemoRequest & { professor: User | null }) {
  if (!isEmailConfigured || !demoRequest.professor || !demoRequest.scheduledAt) return;

  const brandName = SITE_CONFIG[demoRequest.site].brandName;
  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    demoRequest.scheduledAt
  );
  const linkLine = demoRequest.meetingLink
    ? `<p><a href="${demoRequest.meetingLink}">Join the call here</a></p>`
    : "";

  await sendEmail({
    to: demoRequest.email,
    subject: `Your ${brandName} demo call is scheduled`,
    html: `
      <p>Hi ${demoRequest.name},</p>
      <p>Your demo call with <strong>${demoRequest.professor.name}</strong> is scheduled for
      <strong>${when}</strong>.</p>
      ${linkLine}
      <p>— ${brandName}</p>
    `,
  });

  await sendEmail({
    to: demoRequest.professor.email,
    subject: `Demo call scheduled with ${demoRequest.name}`,
    html: `
      <p>Hi ${demoRequest.professor.name},</p>
      <p>A demo call with <strong>${demoRequest.name}</strong> (${demoRequest.email}${
        demoRequest.phone ? `, ${demoRequest.phone}` : ""
      }) about <strong>${demoRequest.subject}</strong> is scheduled for <strong>${when}</strong>.</p>
      ${linkLine}
      <p>— ${brandName}</p>
    `,
  });
}

export async function sendDemoRequestReminder(demoRequest: DemoRequest) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[demoRequest.site].brandName;
  const statusPhrase =
    demoRequest.status === "SCHEDULED" && demoRequest.scheduledAt
      ? `scheduled for ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(demoRequest.scheduledAt)}`
      : "still awaiting scheduling";

  await sendEmail({
    to: demoRequest.email,
    subject: `Following up on your ${brandName} demo request`,
    html: `
      <p>Hi ${demoRequest.name},</p>
      <p>Just checking in — your free demo request for <strong>${demoRequest.subject}</strong> is
      ${statusPhrase}. Reply to this email if you have any questions or need to reschedule.</p>
      <p>— ${brandName}</p>
    `,
  });

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, site: demoRequest.site },
    select: { email: true },
  });
  await Promise.all(
    admins.map((admin) =>
      sendEmail({
        to: admin.email,
        subject: `Reminder: ${demoRequest.name}'s demo request is unresolved`,
        html: `
          <p>The demo request from <strong>${demoRequest.name}</strong> (${demoRequest.email}) is
          ${statusPhrase} and still awaiting a final outcome (joining or dropped). Please follow up.</p>
        `,
      })
    )
  );
}
