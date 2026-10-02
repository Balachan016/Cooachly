import "server-only";
import twilioLib from "twilio";
import { getAppUrl } from "@/lib/url";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
const reminderContentSid = process.env.TWILIO_REMINDER_CONTENT_SID;
const inviteContentSid = process.env.TWILIO_INVITE_CONTENT_SID;
const demoContentSid = process.env.TWILIO_DEMO_CONTENT_SID;

export const isWhatsAppConfigured = Boolean(accountSid && authToken && whatsappFrom);

const client = accountSid && authToken ? twilioLib(accountSid, authToken) : null;

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
