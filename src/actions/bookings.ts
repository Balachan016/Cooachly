"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { getAvailableSlots, SESSION_LENGTH_MINUTES } from "@/lib/scheduling";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { provisionVideoRoomForBooking } from "@/lib/daily";

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
  if (!professor || !professor.professorProfile) return { message: "Professor not found." };

  const slots = await getAvailableSlots(professorId);
  const match = slots.find((s) => s.startAt.getTime() === startDate.getTime());
  if (!match) return { message: "That slot is no longer available. Please pick another." };

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      studentId: session.userId,
      professorId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() },
    },
  });

  const priceCents = professor.professorProfile.hourlyRateCents;

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
    revalidatePath("/student/bookings");
    revalidatePath("/professor/bookings");
    redirect(`/student/bookings?booked=${booking.id}`);
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
    revalidatePath("/student/bookings");
    revalidatePath("/professor/bookings");
    redirect(`/student/bookings?booked=${booking.id}`);
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
            name: `${SESSION_LENGTH_MINUTES}-minute session with ${professor.name}`,
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/student/bookings?booked=${booking.id}`,
    cancel_url: `${appUrl}/student/professors/${professorId}?cancelled=1`,
    metadata: { bookingId: booking.id, type: "booking" },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: checkoutSession.id },
  });

  redirect(checkoutSession.url ?? `${appUrl}/student/bookings`);
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

  revalidatePath("/student/bookings");
  revalidatePath("/professor/bookings");
}

export async function setMeetingLink(bookingId: string, meetingLink: string) {
  const session = await requireRole("PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.professorId !== session.userId) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { meetingLink: meetingLink.trim() || null },
  });

  revalidatePath("/professor/bookings");
  revalidatePath("/student/bookings");
}

export async function markBookingCompleted(bookingId: string) {
  const session = await requireRole("PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.professorId !== session.userId) return;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  revalidatePath("/professor/bookings");
  revalidatePath("/student/bookings");
}
