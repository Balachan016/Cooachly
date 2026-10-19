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

/**
 * Every outgoing message now goes out on BOTH WhatsApp and plain SMS — a
 * recipient who misses one (app not installed, WhatsApp delivery silently
 * rejected) still gets the other. Each country's SMS leg needs its own
 * locally-registered sender number, since neither Twilio nor local carriers
 * let a single number send compliant SMS everywhere:
 *   - US/Canada: needs A2P 10DLC registration (TWILIO_SMS_FROM_US)
 *   - India: needs DLT registration with Indian telecom regulators
 *     (TWILIO_SMS_FROM_INDIA) — see README
 * Leave either one unset to skip that country's SMS leg (WhatsApp still
 * goes out) until it's registered.
 */
const smsSenders: { prefix: string; from: string | undefined }[] = [
  { prefix: "+1", from: process.env.TWILIO_SMS_FROM_US },
  { prefix: "+91", from: process.env.TWILIO_SMS_FROM_INDIA },
];

function getSmsFrom(to: string): string | undefined {
  return smsSenders.find((sender) => to.startsWith(sender.prefix))?.from;
}

export const isWhatsAppConfigured = Boolean(accountSid && authToken && whatsappFrom);
export const isSmsConfigured = Boolean(accountSid && authToken && smsSenders.some((sender) => sender.from));

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

export const smsConfigStatus = {
  us: {
    configured: Boolean(accountSid && authToken && process.env.TWILIO_SMS_FROM_US),
    from: process.env.TWILIO_SMS_FROM_US ?? null,
  },
  india: {
    configured: Boolean(accountSid && authToken && process.env.TWILIO_SMS_FROM_INDIA),
    from: process.env.TWILIO_SMS_FROM_INDIA ?? null,
  },
};

const client = accountSid && authToken ? twilioLib(accountSid, authToken) : null;

// Was true while the reminder content template was pending Meta's approval
// (every outgoing WhatsApp message was restricted to admins/superadmins so
// the team could verify delivery without spamming everyone else with
// messages that might fail). The template is now approved — flip this back
// to true if WhatsApp delivery needs to be locked down to admins again for
// any reason (e.g. troubleshooting a newly submitted template).
const RESTRICT_WHATSAPP_TO_ADMINS_ONLY = false;

export type WhatsAppSendResult = {
  skipped: boolean;
  error?: string;
  from?: string;
  to: string;
  sid?: string;
  channel: "WHATSAPP" | "SMS";
};

async function createMessage(
  to: string,
  payload: { body: string } | { contentSid: string; contentVariables: string }
): Promise<WhatsAppSendResult> {
  // Echoed back on every result so callers can log exactly which numbers it
  // went from/to (without Twilio's "whatsapp:" channel prefix).
  const addresses = { from: whatsappFrom?.replace(/^whatsapp:/, ""), to, channel: "WHATSAPP" as const };

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

/**
 * Plain SMS, sent alongside every WhatsApp message below — see the
 * smsSenders comment above. Unlike WhatsApp, Twilio/carrier rules don't
 * require a pre-approved Content Template for SMS bodies (once the sending
 * number has completed its local registration), so this always sends the
 * plain free-text body no matter which sendWhatsApp* function called it.
 */
async function sendSms(to: string, body: string): Promise<WhatsAppSendResult> {
  const from = getSmsFrom(to);
  const addresses = { from, to, channel: "SMS" as const };

  if (!client || !from) {
    console.log(`[sms:skipped, not configured] to=${to}`);
    return { skipped: true as const, ...addresses };
  }

  try {
    const appUrl = await getAppUrl();
    const message = await client.messages.create({
      from,
      to,
      statusCallback: `${appUrl}/api/twilio/status`,
      body,
    });
    return { skipped: false as const, sid: message.sid, ...addresses };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? ` (code ${(err as { code: unknown }).code})` : "";
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send SMS message", err);
    return { skipped: false as const, error: `${message}${code}`, ...addresses };
  }
}

export async function sendWhatsApp(opts: { to: string; body: string }): Promise<WhatsAppSendResult[]> {
  return Promise.all([createMessage(opts.to, { body: opts.body }), sendSms(opts.to, opts.body)]);
}

/**
 * Account invites are "business-initiated" WhatsApp messages too, so the same
 * 24h-window template requirement applies (see sendWhatsAppReminder below).
 * Set TWILIO_INVITE_CONTENT_SID once a template is approved; until then this
 * falls back to a free-form body, which only works on the sandbox. The SMS
 * leg always sends the plain body — no template needed.
 */
export async function sendWhatsAppInvite(opts: {
  to: string;
  body: string;
  variables: { name: string; brandName: string; inviteUrl: string };
}): Promise<WhatsAppSendResult[]> {
  const whatsapp = inviteContentSid
    ? createMessage(opts.to, {
        contentSid: inviteContentSid,
        contentVariables: JSON.stringify({
          "1": opts.variables.name,
          "2": opts.variables.brandName,
          "3": opts.variables.inviteUrl,
        }),
      })
    : createMessage(opts.to, { body: opts.body });

  return Promise.all([whatsapp, sendSms(opts.to, opts.body)]);
}

/**
 * Same 24h-window template requirement as sendWhatsAppReminder. Set
 * TWILIO_DEMO_CONTENT_SID once a template is approved; until then this falls
 * back to a free-form body, which only works on the sandbox. The SMS leg
 * always sends the plain body — no template needed.
 */
export async function sendWhatsAppDemoConfirmation(opts: {
  to: string;
  body: string;
  variables: { name: string; brandName: string; subject: string };
}): Promise<WhatsAppSendResult[]> {
  const whatsapp = demoContentSid
    ? createMessage(opts.to, {
        contentSid: demoContentSid,
        contentVariables: JSON.stringify({
          "1": opts.variables.name,
          "2": opts.variables.brandName,
          "3": opts.variables.subject,
        }),
      })
    : createMessage(opts.to, { body: opts.body });

  return Promise.all([whatsapp, sendSms(opts.to, opts.body)]);
}

/**
 * Reminders are "business-initiated" WhatsApp messages sent outside any 24h
 * customer-service window, so once you're off Twilio's sandbox, Meta/WhatsApp
 * reject free-form bodies for them (Twilio error 21654, "ContentSid Required")
 * and require a pre-approved Content Template instead. Set
 * TWILIO_REMINDER_CONTENT_SID once you have one approved (see README); until
 * then this falls back to a free-form body, which only works on the sandbox.
 * The SMS leg always sends the plain body — no template needed.
 */
export async function sendWhatsAppReminder(opts: {
  to: string;
  body: string;
  variables: { recipientName: string; peerName: string; label: string; when: string; joinLink: string };
}): Promise<WhatsAppSendResult[]> {
  const whatsapp = reminderContentSid
    ? createMessage(opts.to, {
        contentSid: reminderContentSid,
        contentVariables: JSON.stringify({
          "1": opts.variables.recipientName,
          "2": opts.variables.peerName,
          "3": opts.variables.label,
          "4": opts.variables.when,
          "5": opts.variables.joinLink || "(link not available yet)",
        }),
      })
    : createMessage(opts.to, { body: opts.body });

  return Promise.all([whatsapp, sendSms(opts.to, opts.body)]);
}
