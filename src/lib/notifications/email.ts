import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || "Cooachly <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendEmail(opts: { to: string; subject: string; html: string }) {
  if (!resend) {
    console.log(`[email:skipped, not configured] to=${opts.to} subject="${opts.subject}"`);
    return { skipped: true as const };
  }

  try {
    await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return { skipped: false as const };
  } catch (err) {
    console.error("Failed to send email", err);
    return { skipped: false as const, error: err };
  }
}
