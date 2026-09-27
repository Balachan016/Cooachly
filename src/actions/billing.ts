"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { sitePath } from "@/lib/site";

export async function subscribeToProfessor(professorId: string) {
  const session = await requireRole("STUDENT");

  if (!isStripeConfigured) {
    redirect(sitePath(session.site, `/student/professors/${professorId}?error=stripe-not-configured`));
  }

  const professor = await prisma.user.findUnique({
    where: { id: professorId, role: "PROFESSOR" },
    include: { professorProfile: true },
  });

  if (!professor || professor.site !== session.site || !professor.professorProfile?.monthlyPriceCents) {
    redirect(sitePath(session.site, `/student/professors/${professorId}?error=no-subscription-plan`));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const student = await prisma.user.findUnique({ where: { id: session.userId } });
  let customerId = student?.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: session.email, name: session.name });
    customerId = customer.id;
    await prisma.user.update({ where: { id: session.userId }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: professor!.professorProfile!.monthlyPriceCents!,
          recurring: { interval: "month" },
          product_data: { name: `Monthly coaching with ${professor!.name}` },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}${sitePath(session.site, `/student/professors/${professorId}?subscribed=1`)}`,
    cancel_url: `${appUrl}${sitePath(session.site, `/student/professors/${professorId}?cancelled=1`)}`,
    metadata: { studentId: session.userId, professorId, type: "subscription" },
  });

  redirect(checkoutSession.url ?? `${appUrl}${sitePath(session.site, `/student/professors/${professorId}`)}`);
}
