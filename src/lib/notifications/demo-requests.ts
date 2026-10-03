import "server-only";
import type { DemoRequest, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail, isEmailConfigured } from "./email";
import { formatWhenFor } from "./format";
import { SITE_CONFIG, sitePath } from "@/lib/site";
import { getAppUrl } from "@/lib/url";
import { createPasswordSetupLink } from "@/lib/tokens";

export async function sendDemoRequestScheduledEmail(
  demoRequest: DemoRequest & { professor: User | null },
  opts: { newAccountTempPassword?: string } = {}
) {
  if (!isEmailConfigured || !demoRequest.professor || !demoRequest.scheduledAt) return;

  const brandName = SITE_CONFIG[demoRequest.site].brandName;
  const scheduledAt = demoRequest.scheduledAt;
  const whenForRequester = formatWhenFor(scheduledAt, demoRequest.timezone ?? "UTC");
  const whenForProfessor = formatWhenFor(scheduledAt, demoRequest.professor.timezone);
  const linkLine = demoRequest.meetingLink
    ? `<p><a href="${demoRequest.meetingLink}">Join the call here</a></p>`
    : "";

  const appUrl = await getAppUrl();
  const loginLine = opts.newAccountTempPassword
    ? `
      <p>We've also set up your ${brandName} account so you can see this booking and message
      ${demoRequest.professor.name} directly:</p>
      <p><a href="${appUrl}${sitePath(demoRequest.site, "/login")}">${appUrl}${sitePath(demoRequest.site, "/login")}</a><br/>
      Email: <strong>${demoRequest.email}</strong><br/>
      Temporary password: <strong>${opts.newAccountTempPassword}</strong></p>
    `
    : "";

  await sendEmail({
    to: demoRequest.email,
    site: demoRequest.site,
    subject: `Your ${brandName} demo call is scheduled`,
    html: `
      <p>Hi ${demoRequest.name},</p>
      <p>Your demo call with <strong>${demoRequest.professor.name}</strong> is scheduled for
      <strong>${whenForRequester}</strong>.</p>
      ${linkLine}
      ${loginLine}
      <p>— ${brandName}</p>
    `,
  });

  await sendEmail({
    to: demoRequest.professor.email,
    site: demoRequest.site,
    subject: `Demo call scheduled with ${demoRequest.name}`,
    html: `
      <p>Hi ${demoRequest.professor.name},</p>
      <p>A demo call with <strong>${demoRequest.name}</strong> (${demoRequest.email}${
        demoRequest.phone ? `, ${demoRequest.phone}` : ""
      }) about <strong>${demoRequest.subject}</strong>${
        demoRequest.grade ? ` (Grade: ${demoRequest.grade})` : ""
      } is scheduled for <strong>${whenForProfessor}</strong>.</p>
      ${linkLine}
      <p>— ${brandName}</p>
    `,
  });
}

/**
 * Sent once a demo call is marked JOINED — the lead is now a real student.
 * The account created when the call was scheduled only had a temp password
 * emailed in plaintext, so this hands them a proper, secure "set your own
 * password" link instead, in a warmer welcome-aboard email.
 */
export async function sendDemoJoinedWelcomeEmail(demoRequest: DemoRequest) {
  if (!isEmailConfigured) return;

  const student = await prisma.user.findUnique({
    where: { site_email: { site: demoRequest.site, email: demoRequest.email } },
  });
  if (!student) return;

  const brandName = SITE_CONFIG[demoRequest.site].brandName;
  const setupUrl = await createPasswordSetupLink(demoRequest.site, student.id);

  await sendEmail({
    to: demoRequest.email,
    site: demoRequest.site,
    subject: `Welcome to ${brandName}!`,
    html: `
      <p>Hi ${demoRequest.name},</p>
      <p>It was great having you at your demo session — welcome aboard! Your ${brandName} account is ready
      so you can book sessions, message your coach, and keep track of everything in one place.</p>
      <p><a href="${setupUrl}">Set your password and sign in</a></p>
      <p>This link expires in 1 hour — if it does, just use &quot;Forgot password&quot; on the login page to get a new one.</p>
      <p>We're looking forward to being part of your learning journey!</p>
      <p>— The ${brandName} team</p>
    `,
  });
}

export async function sendDemoRequestReminder(demoRequest: DemoRequest) {
  if (!isEmailConfigured) return;

  const brandName = SITE_CONFIG[demoRequest.site].brandName;
  const statusPhrase =
    demoRequest.status === "SCHEDULED" && demoRequest.scheduledAt
      ? `scheduled for ${formatWhenFor(demoRequest.scheduledAt, demoRequest.timezone ?? "UTC")}`
      : "still awaiting scheduling";

  await sendEmail({
    to: demoRequest.email,
    site: demoRequest.site,
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
        site: demoRequest.site,
        subject: `Reminder: ${demoRequest.name}'s demo request is unresolved`,
        html: `
          <p>The demo request from <strong>${demoRequest.name}</strong> (${demoRequest.email}) for
          <strong>${demoRequest.subject}</strong>${demoRequest.grade ? ` (Grade: ${demoRequest.grade})` : ""} is
          ${statusPhrase} and still awaiting a final outcome (joining or dropped). Please follow up.</p>
        `,
      })
    )
  );
}
