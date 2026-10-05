import "server-only";
import twilioLib from "twilio";
import { getAppUrl } from "@/lib/url";
import { prisma } from "@/lib/prisma";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
const reminderContentSid = process.env.TWILIO_REMINDER_CONTENT_SID;
const inviteContentSid = process.env.TWILIO_INVITE_CONTENT_SID;
const demoContentSid = process.env.TWILIO_DEMO_CONTENT_SID;

export const isWhatsAppConfigured = Boolean(accountSid && authToken && whatsappFrom);

// Read-only snapshot for the superadmin reminders page, so "is the template
// SID actually deployed?" can be checked by loading a page instead of
// guessing from Twilio error codes. Content template SIDs aren't secrets
// (they just identify a pre-approved message template), so it's safe to
// show them in full.
export const whatsAppConfigStatus = {
  configured: isWhatsAppConfigured,
  from: whatsappFrom?.replace(/^whatsapp:/, "") ?? null,
  reminderTemplateSid: reminderContentSid ?? null,
  inviteTemplateSid: inviteContentSid ?? null,
  demoTemplateSid: demoContentSid ?? null,
};

const client = accountSid && authToken ? twilioLib(accountSid, authToken) : null;

// TEMPORARY: WhatsApp delivery is unreliable for regular students/professors
// right now (see the ongoing Twilio/WhatsApp-sender troubleshooting). Until
// that's confirmed fixed, every outgoing WhatsApp message — reminders,
// invites, demo confirmations, everything — is restricted to admins and
// superadmins, so the team can keep verifying delivery without spamming
// everyone else with messages that might not arrive. Email still goes out to
// everyone as normal; this only gates the WhatsApp channel. Flip this back
// to false once WhatsApp is working for everyone again.
const RESTRICT_WHATSAPP_TO_ADMINS_ONLY = true;

export type WhatsAppSendResult = { skipped: boolean; error?: string; from?: string; to: string; sid?: string };

async function createMessage(
  to: string,
  payload: { body: string } | { contentSid: string; contentVariables: string }
): Promise<WhatsAppSendResult> {
  // Echoed back on every result so callers can log exactly which numbers it
  // went from/to (without Twilio's "whatsapp:" channel prefix).
  const addresses = { from: whatsappFrom?.replace(/^whatsapp:/, ""), to };

  if (!client || !whatsappFrom) {
    console.log(`[whatsapp:skipped, not configured] to=${to}`);
    return { skipped: true as const, ...addresses };
  }

  if (RESTRICT_WHATSAPP_TO_ADMINS_ONLY) {
    const recipientIsAdmin = await prisma.user.findFirst({
      where: { phone: to, role: { in: ["ADMIN", "SUPERADMIN"] } },
      select: { id: true },
    });
    if (!recipientIsAdmin) {
      console.log(`[whatsapp:skipped, restricted to admins] to=${to}`);
      return { skipped: true as const, ...addresses };
    }
  }

  try {
    // Twilio only confirms it *accepted* the message here — actual delivery
    // (or Meta/WhatsApp-side rejection) is reported asynchronously to this
    // statusCallback URL, which /api/twilio/status matches back to the
    // NotificationLog row via the returned message SID.
    const appUrl = await getAppUrl();
    const message = await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${to}`,
      statusCallback: `${appUrl}/api/twilio/status`,
      ...payload,
    });
    return { skipped: false as const, sid: message.sid, ...addresses };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? ` (code ${(err as { code: unknown }).code})` : "";
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send WhatsApp message", err);
    return { skipped: false as const, error: `${message}${code}`, ...addresses };
  }
}

export async function sendWhatsApp(opts: { to: string; body: string }) {
  return createMessage(opts.to, { body: opts.body });
}

/**
 * Account invites are "business-initiated" WhatsApp messages too, so the same
 * 24h-window template requirement applies (see sendWhatsAppReminder below).
 * Set TWILIO_INVITE_CONTENT_SID once a template is approved; until then this
 * falls back to a free-form body, which only works on the sandbox.
 */
export async function sendWhatsAppInvite(opts: {
  to: string;
  body: string;
  variables: { name: string; brandName: string; inviteUrl: string };
}) {
  if (!inviteContentSid) return createMessage(opts.to, { body: opts.body });

  return createMessage(opts.to, {
    contentSid: inviteContentSid,
    contentVariables: JSON.stringify({
      "1": opts.variables.name,
      "2": opts.variables.brandName,
      "3": opts.variables.inviteUrl,
    }),
  });
}

/**
 * Same 24h-window template requirement as sendWhatsAppReminder. Set
 * TWILIO_DEMO_CONTENT_SID once a template is approved; until then this falls
 * back to a free-form body, which only works on the sandbox.
 */
export async function sendWhatsAppDemoConfirmation(opts: {
  to: string;
  body: string;
  variables: { name: string; brandName: string; subject: string };
}) {
  if (!demoContentSid) return createMessage(opts.to, { body: opts.body });

  return createMessage(opts.to, {
    contentSid: demoContentSid,
    contentVariables: JSON.stringify({
      "1": opts.variables.name,
      "2": opts.variables.brandName,
      "3": opts.variables.subject,
    }),
  });
}

/**
 * Reminders are "business-initiated" WhatsApp messages sent outside any 24h
 * customer-service window, so once you're off Twilio's sandbox, Meta/WhatsApp
 * reject free-form bodies for them (Twilio error 21654, "ContentSid Required")
 * and require a pre-approved Content Template instead. Set
 * TWILIO_REMINDER_CONTENT_SID once you have one approved (see README); until
 * then this falls back to a free-form body, which only works on the sandbox.
 */
export async function sendWhatsAppReminder(opts: {
  to: string;
  body: string;
  variables: { recipientName: string; peerName: string; label: string; when: string; joinLink: string };
}) {
  if (!reminderContentSid) return createMessage(opts.to, { body: opts.body });

  return createMessage(opts.to, {
    contentSid: reminderContentSid,
    contentVariables: JSON.stringify({
      "1": opts.variables.recipientName,
      "2": opts.variables.peerName,
      "3": opts.variables.label,
      "4": opts.variables.when,
      "5": opts.variables.joinLink || "(link not available yet)",
    }),
  });
}
