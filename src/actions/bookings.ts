"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { getAvailableSlots, SESSION_LENGTH_MINUTES } from "@/lib/scheduling";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { provisionVideoRoomForBooking, updateDailyRoomExpiry } from "@/lib/daily";
import { sitePath } from "@/lib/site";

const BookSlotSchema = z.object({
  professorId: z.string().min(1),
  startAt: z.string().min(1),
});

export async function bookSlot(_state: unknown, formData: FormData) {
  const session = await requireRole("STUDENT");

  const parsed = BookSlotSchema.safeParse({
    professorId: formData.get("professorId"),
    startAt: formData.get("startAt"),
  });
  if (!parsed.success) return { message: "Invalid booking request." };

  const { professorId, startAt } = parsed.data;
  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) return { message: "Invalid time selected." };

  const professor = await prisma.user.findUnique({
    where: { id: professorId, role: "PROFESSOR" },
    include: { professorProfile: true },
  });
  if (!professor || !professor.professorProfile || professor.site !== session.site) {
    return { message: "Professor not found." };
  }

  const slots = await getAvailableSlots(professorId);
  const match = slots.find((s) => s.startAt.getTime() === startDate.getTime());
  if (!match) return { message: "That slot is no longer available. Please pick another." };

  // Cooachly Arts doesn't run payment through the platform at all — gurus
  // quote and collect their own rate directly with each student, so every
  // class just auto-confirms with no Stripe step and no price on record.
  if (session.site === "ARTS") {
    const booking = await prisma.booking.create({
      data: {
        studentId: session.userId,
        professorId,
        startAt: match.startAt,
        endAt: match.endAt,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        priceCents: 0,
      },
    });
    await provisionVideoRoomForBooking(booking);
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    redirect(sitePath(session.site, `/student/bookings?booked=${booking.id}`));
  }

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      studentId: session.userId,
      professorId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() },
    },
  });

  // hourlyRateCents is the professor's price for a SESSION_LENGTH_MINUTES session; prorate for the slot's actual length.
  const priceCents = Math.round(
    (professor.professorProfile.hourlyRateCents * match.sessionLengthMinutes) / SESSION_LENGTH_MINUTES
  );

  if (activeSubscription) {
    const booking = await prisma.booking.create({
      data: {
        studentId: session.userId,
        professorId,
        startAt: match.startAt,
        endAt: match.endAt,
        status: "CONFIRMED",
        paymentStatus: "COVERED_BY_SUBSCRIPTION",
        priceCents,
      },
    });
    await provisionVideoRoomForBooking(booking);
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    redirect(sitePath(session.site, `/student/bookings?booked=${booking.id}`));
  }

  const booking = await prisma.booking.create({
    data: {
      studentId: session.userId,
      professorId,
      startAt: match.startAt,
      endAt: match.endAt,
      status: isStripeConfigured ? "PENDING" : "CONFIRMED",
      paymentStatus: "UNPAID",
      priceCents,
    },
  });

  if (!isStripeConfigured) {
    await provisionVideoRoomForBooking(booking);
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    redirect(sitePath(session.site, `/student/bookings?booked=${booking.id}`));
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  let customerId = null as string | null;
  const student = await prisma.user.findUnique({ where: { id: session.userId } });
  if (student?.stripeCustomerId) {
    customerId = student.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({ email: session.email, name: session.name });
    customerId = customer.id;
    await prisma.user.update({ where: { id: session.userId }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: `${match.sessionLengthMinutes}-minute session with ${professor.name}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}${sitePath(session.site, `/student/bookings?booked=${booking.id}`)}`,
    cancel_url: `${appUrl}${sitePath(session.site, `/student/professors/${professorId}?cancelled=1`)}`,
    metadata: { bookingId: booking.id, type: "booking" },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  redirect(checkoutSession.url ?? `${appUrl}${sitePath(session.site, "/student/bookings")}`);
}

export async function cancelBooking(bookingId: string) {
  const session = await requireRole("STUDENT", "PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return;
  if (booking.studentId !== session.userId && booking.professorId !== session.userId) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
}

export async function setMeetingLink(bookingId: string, meetingLink: string) {
  const session = await requireRole("PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.professorId !== session.userId) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { meetingLink: meetingLink.trim() || null },
  });

  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/student/bookings"));
}

export async function extendBooking(bookingId: string, minutes: 15 | 30) {
  const session = await requireRole("ADMIN");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { professor: true } });
  if (!booking || booking.status === "CANCELLED" || booking.professor.site !== session.site) return;

  const newEndAt = new Date(booking.endAt.getTime() + minutes * 60_000);
  await prisma.booking.update({ where: { id: bookingId }, data: { endAt: newEndAt } });

  if (booking.dailyRoomName) {
    const newExp = Math.floor(newEndAt.getTime() / 1000) + 2 * 60 * 60; // same 2h wrap-up buffer as room creation
    await updateDailyRoomExpiry(booking.dailyRoomName, newExp);
  }

  revalidatePath(sitePath(session.site, "/admin/bookings"));
  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
}

export async function markBookingCompleted(bookingId: string) {
  const session = await requireRole("PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.professorId !== session.userId) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/student/bookings"));
}
