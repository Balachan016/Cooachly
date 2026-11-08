import { NextResponse } from "next/server";
import twilioLib from "twilio";
import { prisma } from "@/lib/prisma";

// Twilio calls this automatically for every WhatsApp/SMS message and every
// Voice call we send (the exact URL is passed per-send as `statusCallback`
// in sms.ts — nothing to configure in the Twilio console). It reports the
// real lifecycle asynchronously — message: queued → sent → delivered/read,
// or undelivered/failed; call: queued → ringing → in-progress →
// completed/busy/failed/no-answer — which is the only way to tell "Twilio
// accepted it" apart from "it actually delivered it" — the synchronous API
// response only ever confirms the former. Messages post MessageSid/
// MessageStatus; calls post CallSid/CallStatus — same row, same columns,
// whichever pair is present.
export async function POST(request: Request) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature");
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody));

  if (!authToken || !signature || !twilioLib.validateRequest(authToken, signature, request.url, params)) {
    console.warn("Rejected Twilio status callback with invalid or missing signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  const sid = params.MessageSid || params.CallSid;
  const status = params.MessageStatus || params.CallStatus;
  if (sid) {
    const errorCode = params.ErrorCode;
    await prisma.notificationLog.updateMany({
      where: { providerMessageSid: sid },
      data: {
        deliveryStatus: status ?? null,
        deliveryError: errorCode ? `${params.ErrorMessage || "Delivery failed"} (code ${errorCode})` : null,
        deliveryUpdatedAt: new Date(),
      },
    });
  }

  return NextResponse.json({ ok: true });
}
