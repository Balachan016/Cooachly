import "server-only";
import { Resend } from "resend";
import type { Site } from "@prisma/client";
import { renderEmailLayout } from "./email-template";
import { getAppUrl } from "@/lib/url";

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || "Cooachly <onboarding@resend.dev>";

export const isEmailConfigured = Boolean(apiKey);

const resend = apiKey ? new Resend(apiKey) : null;

export type EmailSendResult = { skipped: boolean; error?: string; from: string; to: string; cc?: string[] };

export type EmailAttachment = { filename: string; content: string; contentType?: string };

// `site` picks which brand's logo/footer wraps the email. Every caller in
// this codebase belongs to one site or the other — pass it so the HTML you
// hand in (a few lines of <p>…</p>) always goes out looking like a real,
// professional product email instead of bare text.
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  site: Site;
  cc?: string[];
  attachments?: EmailAttachment[];
}): Promise<EmailSendResult> {
  // Echoed back on every result so callers can log exactly who it went from/to.
  const addresses = { from: fromAddress, to: opts.to, cc: opts.cc?.length ? opts.cc : undefined };

  if (!resend) {
    console.log(`[email:skipped, not configured] to=${opts.to} subject="${opts.subject}"`);
    return { skipped: true as const, ...addresses };
  }

  const appUrl = await getAppUrl();
  const html = renderEmailLayout({ site: opts.site, appUrl, bodyHtml: opts.html });

  try {
    const result = await resend.emails.send({
      from: fromAddress,
      to: opts.to,
      cc: addresses.cc,
      subject: opts.subject,
      html,
      attachments: opts.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
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
