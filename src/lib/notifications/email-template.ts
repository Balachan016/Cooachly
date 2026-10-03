import "server-only";
import type { Site } from "@prisma/client";
import { SITE_CONFIG } from "@/lib/site";

/**
 * Wraps a notification's inner HTML in a consistent branded shell — logo,
 * card, footer with contact details — so every outgoing email (bookings,
 * reminders, invites, AI summaries, admin notices…) looks like it came from
 * the same professional product rather than a bare paragraph of text.
 */
export function renderEmailLayout(opts: { site: Site; appUrl: string; bodyHtml: string }): string {
  const config = SITE_CONFIG[opts.site];
  const logoUrl = `${opts.appUrl}${config.logoPath}`;

  return `
<div style="background-color:#f4f5f1; padding:32px 16px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:560px; margin:0 auto; background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e5e5e0;">
    <div style="background-color:#0f3d2e; padding:24px; text-align:center;">
      <img src="${logoUrl}" alt="${config.brandName}" width="56" height="56" style="display:inline-block; border-radius:12px; vertical-align:middle;" />
      <div style="display:inline-block; vertical-align:middle; margin-left:12px; color:#ffffff; font-size:18px; font-weight:600;">
        ${config.brandName}
      </div>
    </div>
    <div style="padding:28px 28px 8px; color:#1a1a1a; font-size:15px; line-height:1.6;">
      ${opts.bodyHtml}
    </div>
    <div style="padding:20px 28px 28px;">
      <div style="border-top:1px solid #efefe9; padding-top:16px; color:#6b6b63; font-size:12px; line-height:1.6;">
        <p style="margin:0 0 4px;"><strong>${config.brandName}</strong> — ${config.tagline}</p>
        <p style="margin:0;">
          Questions? Email <a href="mailto:${config.supportEmail}" style="color:#0f3d2e;">${config.supportEmail}</a>
          or call ${config.supportPhone}.
        </p>
      </div>
    </div>
  </div>
</div>
  `.trim();
}
