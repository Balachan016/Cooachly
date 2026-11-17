import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { resend, inboundWebhookSecret } from "@/lib/notifications/inbound-email";

// Configure this URL as a webhook in Resend's dashboard (Webhooks →
// Add Webhook), subscribed to the "email.received" event, once you've
// enabled receiving on the domain and added the MX record Resend shows you
// — see README "Receiving mail at admin@cooachly.com". The webhook's own
// signing secret (shown when you create it) goes in
// RESEND_INBOUND_WEBHOOK_SECRET; this is a different secret from
// RESEND_API_KEY.
//
// The email.received payload itself only carries metadata (from/to/subject/
// id) — the actual body is fetched separately via
// resend.emails.receiving.get(id), same as Daily's transcript webhook only
// hands over an id and this app fetches the transcript body itself.
export async function POST(request: Request) {
  if (!resend || !inboundWebhookSecret) {
    return NextResponse.json({ error: "Inbound mail isn't configured" }, { status: 503 });
  }

  const payload = await request.text();
  const id = request.headers.get("webhook-id");
  const timestamp = request.headers.get("webhook-timestamp");
  const signature = request.headers.get("webhook-signature");
  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 401 });
  }

  let event;
  try {
    event = resend.webhooks.verify({ payload, headers: { id, timestamp, signature }, webhookSecret: inboundWebhookSecret });
  } catch (err) {
    console.error("Rejected Resend inbound webhook with invalid signature", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const { email_id: emailId } = event.data;

  // Resend retries a webhook delivery on a non-2xx response, which would
  // otherwise store the same message twice — resendId is unique, so check
  // first rather than letting a duplicate insert throw.
  const existing = await prisma.inboundEmail.findUnique({ where: { resendId: emailId } });
  if (existing) {
    return NextResponse.json({ ok: true, alreadyStored: true });
  }

  const { data: full, error } = await resend.emails.receiving.get(emailId);
  if (error || !full) {
    console.error("Failed to fetch inbound email body from Resend", error);
    return NextResponse.json({ error: "Could not fetch email body" }, { status: 502 });
  }

  await prisma.inboundEmail.create({
    data: {
      site: "COOACHLY",
      resendId: emailId,
      from: full.from,
      to: full.to.join(", "),
      subject: full.subject,
      html: full.html,
      text: full.text,
    },
  });

  revalidatePath("/admin/mail");

  return NextResponse.json({ ok: true });
}
