import "server-only";
import type { Test, TestAssignment, User } from "@prisma/client";
import { sendEmail, isEmailConfigured } from "./email";
import { logNotification } from "./log";
import { getAdminCcEmails } from "./admin-recipients";
import { formatWhenFor } from "./format";
import { SITE_CONFIG, sitePath } from "@/lib/site";
import { getAppUrl } from "@/lib/url";

/** Sent to each student the moment a professor assigns a test to them. */
export async function sendTestAssignedEmail(test: Test, assignment: TestAssignment, student: User, professor: User) {
  if (!isEmailConfigured) return;

  const appUrl = await getAppUrl();
  const link = `${appUrl}${sitePath(student.site, `/student/tests/${assignment.id}`)}`;
  const brandName = SITE_CONFIG[student.site].brandName;
  const dueWhen = formatWhenFor(test.dueAt, student.timezone);

  const result = await sendEmail({
    to: student.email,
    cc: getAdminCcEmails(),
    site: student.site,
    subject: `New test from ${professor.name}: ${test.title}`,
    html: `
      <p>Hi ${student.name},</p>
      <p><strong>${professor.name}</strong> has assigned you a new test: <strong>${test.title}</strong>.</p>
      ${test.description ? `<p>${test.description}</p>` : ""}
      <p><strong>Due:</strong> ${dueWhen}</p>
      <p><a href="${link}">Click here to take the test</a></p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({ userId: student.id, channel: "EMAIL", kind: "test_assigned", result });
}

/** Sent once the professor clicks "Share test score" — this is the only point the student learns their score. */
export async function sendTestScoreSharedEmail(test: Test, assignment: TestAssignment, student: User, professor: User) {
  if (!isEmailConfigured) return;

  const appUrl = await getAppUrl();
  const link = `${appUrl}${sitePath(student.site, `/student/tests/${assignment.id}`)}`;
  const brandName = SITE_CONFIG[student.site].brandName;
  const score = assignment.totalScore ?? 0;

  const result = await sendEmail({
    to: student.email,
    cc: getAdminCcEmails(),
    site: student.site,
    subject: `Your score for "${test.title}" is in`,
    html: `
      <p>Hi ${student.name},</p>
      <p><strong>${professor.name}</strong> has graded your test <strong>${test.title}</strong> and shared your score:</p>
      <p style="font-size: 20px;"><strong>${score} / ${assignment.totalMarks}</strong></p>
      <p><a href="${link}">Click here to see the full breakdown</a></p>
      <p>— ${brandName}</p>
    `,
  });
  await logNotification({ userId: student.id, channel: "EMAIL", kind: "test_score_shared", result });
}
