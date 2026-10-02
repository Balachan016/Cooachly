import { NextResponse } from "next/server";
import twilioLib from "twilio";
import { prisma } from "@/lib/prisma";

// Twilio calls this automatically for every WhatsApp message we send (the
// exact URL is passed per-message as `statusCallback` in sms.ts — nothing to
// configure in the Twilio console). It reports the message's real lifecycle
// (queued → sent → delivered/read, or undelivered/failed) asynchronously,
// which is the only way to tell "Twilio accepted it" apart from "WhatsApp
// actually delivered it" — the synchronous API response only ever confirms
// the former.
export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  if (!authToken || !signature || !twilioLib.validateRequest(authToken, signature, request.url, params)) {
    console.warn("Rejected Twilio status callback with invalid or missing signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const messageSid = params.MessageSid;
  if (messageSid) {
    const errorCode = params.ErrorCode;
    await prisma.notificationLog.updateMany({
      where: { providerMessageSid: messageSid },
      data: {
        deliveryStatus: params.MessageStatus ?? null,
        deliveryError: errorCode ? `${params.ErrorMessage || "Delivery failed"} (code ${errorCode})` : null,
        deliveryUpdatedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
