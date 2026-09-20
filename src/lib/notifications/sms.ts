import "server-only";
import twilioLib from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
const reminderContentSid = process.env.TWILIO_REMINDER_CONTENT_SID;

export const isWhatsAppConfigured = Boolean(accountSid && authToken && whatsappFrom);

const client = accountSid && authToken ? twilioLib(accountSid, authToken) : null;

async function createMessage(to: string, payload: { body: string } | { contentSid: string; contentVariables: string }) {
  if (!client || !whatsappFrom) {
    console.log(`[whatsapp:skipped, not configured] to=${to}`);
    return { skipped: true as const };
  }

  try {
    await client.messages.create({ from: whatsappFrom, to: `whatsapp:${to}`, ...payload });
    return { skipped: false as const };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? ` (code ${(err as { code: unknown }).code})` : "";
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send WhatsApp message", err);
    return { skipped: false as const, error: `${message}${code}` };
  }
}

export async function sendWhatsApp(opts: { to: string; body: string }) {
  return createMessage(opts.to, { body: opts.body });
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
