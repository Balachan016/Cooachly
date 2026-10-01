import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { provisionVideoRoomForBooking } from "@/lib/daily";
import { sendBookingConfirmation } from "@/lib/notifications/booking-confirmation";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const type = checkoutSession.metadata?.type;

      if (type === "booking") {
        // bookingIds (plural) covers the current multi-slot checkout; bookingId
        // (singular) is kept for any single-booking checkout session created
        // before this field was introduced.
        const bookingIdsRaw = checkoutSession.metadata?.bookingIds ?? checkoutSession.metadata?.bookingId;
        const bookingIds = bookingIdsRaw ? bookingIdsRaw.split(",").filter(Boolean) : [];
        if (bookingIds.length > 0) {
          const paymentIntentId =
            typeof checkoutSession.payment_intent === "string"
              ? checkoutSession.payment_intent
              : checkoutSession.payment_intent?.id;

          await prisma.booking.updateMany({
            where: { id: { in: bookingIds } },
            data: { status: "CONFIRMED", paymentStatus: "PAID", stripePaymentIntentId: paymentIntentId },
          });

          const bookings = await prisma.booking.findMany({
            where: { id: { in: bookingIds } },
            include: { student: true, professor: true },
          });
          for (const booking of bookings) {
            await provisionVideoRoomForBooking(booking);
          }
          await sendBookingConfirmation(bookings);
        }
      }

      if (type === "subscription") {
        const studentId = checkoutSession.metadata?.studentId;
        const professorId = checkoutSession.metadata?.professorId;
        const subscriptionId =
          typeof checkoutSession.subscription === "string"
            ? checkoutSession.subscription
            : checkoutSession.subscription?.id;

        if (studentId && professorId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const currentPeriodEnd = new Date(
            (subscription.items.data[0]?.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) * 1000
          );

          await prisma.subscription.upsert({
            where: { studentId_professorId: { studentId, professorId } },
            create: {
              studentId,
              professorId,
              stripeSubscriptionId: subscriptionId,
              status: "ACTIVE",
              currentPeriodEnd,
            },
            update: {
              stripeSubscriptionId: subscriptionId,
              status: "ACTIVE",
              currentPeriodEnd,
            },
          });
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const status = subscription.status === "active" ? "ACTIVE" : subscription.status === "past_due" ? "PAST_DUE" : "CANCELED";
      const currentPeriodEnd = new Date(
        (subscription.items.data[0]?.current_period_end ?? Math.floor(Date.now() / 1000)) * 1000
      );

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { status, currentPeriodEnd },
      });
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
