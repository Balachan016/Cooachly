import "server-only";
import twilioLib from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const smsFrom = process.env.TWILIO_SMS_FROM;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"

export const isSmsConfigured = Boolean(accountSid && authToken && smsFrom);
export const isWhatsAppConfigured = Boolean(accountSid && authToken && whatsappFrom);

const client = accountSid && authToken ? twilioLib(accountSid, authToken) : null;

export async function sendSms(opts: { to: string; body: string }) {
  if (!client || !smsFrom) {
    console.log(`[sms:skipped, not configured] to=${opts.to}`);
    return { skipped: true as const };
  }

  try {
    await client.messages.create({ from: smsFrom, to: opts.to, body: opts.body });
    return { skipped: false as const };
  } catch (err) {
    console.error("Failed to send SMS", err);
    return { skipped: false as const, error: err };
  }
}

export async function sendWhatsApp(opts: { to: string; body: string }) {
  if (!client || !whatsappFrom) {
    console.log(`[whatsapp:skipped, not configured] to=${opts.to}`);
    return { skipped: true as const };
  }

  try {
    await client.messages.create({
      from: whatsappFrom,
      to: `whatsapp:${opts.to}`,
      body: opts.body,
    });
    return { skipped: false as const };
  } catch (err) {
    console.error("Failed to send WhatsApp message", err);
    return { skipped: false as const, error: err };
  }
}
