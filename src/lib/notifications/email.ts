import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || "Cooachly <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

export type EmailSendResult = { skipped: boolean; error?: string; from: string; to: string; cc?: string[] };

export async function sendEmail(opts: { to: string; subject: string; html: string; cc?: string[] }): Promise<EmailSendResult> {
  // Echoed back on every result so callers can log exactly who it went from/to.
  const addresses = { from: fromAddress, to: opts.to, cc: opts.cc?.length ? opts.cc : undefined };

  if (!resend) {
    console.log(`[email:skipped, not configured] to=${opts.to} subject="${opts.subject}"`);
    return { skipped: true as const, ...addresses };
  }

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      cc: addresses.cc,
      subject: opts.subject,
      html: opts.html,
    });
    if (result.error) {
      console.error("Failed to send email", result.error);
      return { skipped: false as const, error: result.error.message, ...addresses };
    }
    return { skipped: false as const, ...addresses };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send email", err);
    return { skipped: false as const, error: message, ...addresses };
  }
}
