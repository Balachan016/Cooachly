import "server-only";
import { Resend } from "resend";

// Shared between /api/mail/inbound (which needs the client + secret to
// verify and fetch messages) and the Admin > Mail page (which just needs to
// know whether to show "not configured yet") — kept out of the route file
// itself since a route.ts file can only export HTTP method handlers and a
// small fixed set of config options, nothing else.
const apiKey = process.env.RESEND_API_KEY;
const webhookSecret = process.env.RESEND_INBOUND_WEBHOOK_SECRET;

export const resend = apiKey ? new Resend(apiKey) : null;
export const inboundWebhookSecret = webhookSecret;
export const isInboundMailConfigured = Boolean(apiKey && webhookSecret);
