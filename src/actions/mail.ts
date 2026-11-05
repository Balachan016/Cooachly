"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { sitePath } from "@/lib/site";

export type SendAdminEmailInput = { to: string; cc?: string; subject: string; body: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseAddressList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Plain text the admin typed, as paragraphs — blank lines split paragraphs, single line breaks become <br>. */
function bodyToHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map((para) => `<p>${escapeHtml(para).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/**
 * Sends an ad-hoc email through Cooachly's own mail (Admin > Mail), and logs
 * every attempt to AdminEmail — the repository the tab's history list reads
 * from. One send per "to" address (with the same CC list on each) so each
 * recipient's own address is what they see in "To", not the whole list.
 */
export async function sendAdminEmail(input: SendAdminEmailInput): Promise<{ ok: boolean; message: string }> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  if (!isEmailConfigured) {
    return { ok: false, message: "Email isn't configured, so mail can't be sent yet." };
  }

  const toList = parseAddressList(input.to);
  const ccList = input.cc ? parseAddressList(input.cc) : [];
  if (toList.length === 0) return { ok: false, message: "Enter at least one recipient." };
  const invalid = [...toList, ...ccList].find((addr) => !EMAIL_RE.test(addr));
  if (invalid) return { ok: false, message: `"${invalid}" doesn't look like a valid email address.` };
  if (!input.subject.trim()) return { ok: false, message: "Subject can't be empty." };
  if (!input.body.trim()) return { ok: false, message: "Message can't be empty." };

  const html = bodyToHtml(input.body);
  let failures = 0;

  for (const to of toList) {
    const result = await sendEmail({
      to,
      cc: ccList.length ? ccList : undefined,
      site: session.site,
      subject: input.subject,
      html,
    });
    if (result.error || result.skipped) failures += 1;

    await prisma.adminEmail.create({
      data: {
        site: session.site,
        senderId: session.userId,
        to,
        cc: ccList.length ? ccList.join(", ") : null,
        subject: input.subject,
        body: html,
        status: result.skipped ? "SKIPPED" : result.error ? "FAILED" : "SENT",
        error: result.error,
      },
    });
  }

  revalidatePath(sitePath(session.site, "/admin/mail"));

  if (failures === toList.length) {
    return { ok: false, message: "Couldn't send — check the recipient addresses and mail configuration." };
  }
  if (failures > 0) {
    return { ok: true, message: `Sent to ${toList.length - failures} of ${toList.length} recipients — see the log below for what failed.` };
  }
  return { ok: true, message: `Sent to ${toList.length} recipient${toList.length === 1 ? "" : "s"}.` };
}
