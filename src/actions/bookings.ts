"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AvailableSlot } from "@/lib/scheduling";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { getAvailableSlots, SESSION_LENGTH_MINUTES } from "@/lib/scheduling";
import { MIN_SLOTS_PER_BOOKING, MAX_SLOTS_PER_BOOKING } from "@/lib/booking-rules";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { provisionVideoRoomForBooking, updateDailyRoomExpiry } from "@/lib/daily";
import { sendDemoFollowUpEmail } from "@/lib/notifications/demo-followup";
import { sendBookingConfirmation } from "@/lib/notifications/booking-confirmation";
import { logAudit } from "@/lib/audit";
import { sitePath } from "@/lib/site";

async function createConfirmedBookings(opts: {
  studentId: string;
  professorId: string;
  matches: AvailableSlot[];
  paymentStatus: PaymentStatus;
  priceCentsFor: (slot: AvailableSlot) => number;
}) {
  const bookings = await prisma.$transaction(
    opts.matches.map((slot) =>
      prisma.booking.create({
        data: {
          studentId: opts.studentId,
          professorId: opts.professorId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          status: "CONFIRMED",
          paymentStatus: opts.paymentStatus,
          priceCents: opts.priceCentsFor(slot),
        },
        include: { student: true, professor: true },
      })
    )
  );
  for (const booking of bookings) {
    await provisionVideoRoomForBooking(booking);
  }
  await sendBookingConfirmation(bookings);
  return bookings;
}

export async function bookSlots(_state: unknown, formData: FormData) {
  const session = await requireRole("STUDENT");

  const professorId = String(formData.get("professorId") ?? "");
  const requestedStartAts = Array.from(new Set(formData.getAll("startAts").map(String).filter(Boolean)));
  if (!professorId) return { message: "Invalid booking request." };
  if (requestedStartAts.length < MIN_SLOTS_PER_BOOKING || requestedStartAts.length > MAX_SLOTS_PER_BOOKING) {
    return { message: `Please select between ${MIN_SLOTS_PER_BOOKING} and ${MAX_SLOTS_PER_BOOKING} sessions.` };
  }

  const requestedDates = requestedStartAts.map((s) => new Date(s));
  if (requestedDates.some((d) => Number.isNaN(d.getTime()))) return { message: "Invalid time selected." };

  const professor = await prisma.user.findUnique({
    where: { id: professorId, role: "PROFESSOR" },
    include: { professorProfile: true },
  });
  if (!professor || !professor.professorProfile || professor.site !== session.site) {
    return { message: "Professor not found." };
  }
  const hourlyRateCents = professor.professorProfile.hourlyRateCents;

  const availableSlots = await getAvailableSlots(professorId);
  const matches = requestedDates.map((d) => availableSlots.find((s) => s.startAt.getTime() === d.getTime()));
  if (matches.some((m) => !m)) {
    return { message: "One or more selected sessions are no longer available. Please reselect." };
  }
  const confirmedMatches = matches as AvailableSlot[];

  // hourlyRateCents is the professor's price for a SESSION_LENGTH_MINUTES session; prorate for each slot's actual length.
  const priceCentsFor = (slot: AvailableSlot) => Math.round((hourlyRateCents * slot.sessionLengthMinutes) / SESSION_LENGTH_MINUTES);

  // Cooachly Arts doesn't run payment through the platform at all — gurus
  // quote and collect their own rate directly with each student, so every
  // class just auto-confirms with no Stripe step and no price on record.
  if (session.site === "ARTS") {
    const bookings = await createConfirmedBookings({
      studentId: session.userId,
      professorId,
      matches: confirmedMatches,
      paymentStatus: "UNPAID",
      priceCentsFor: () => 0,
    });
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    redirect(sitePath(session.site, `/student/bookings?booked=${bookings.map((b) => b.id).join(",")}`));
  }

  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      studentId: session.userId,
      professorId,
      status: "ACTIVE",
      currentPeriodEnd: { gt: new Date() },
    },
  });

  if (activeSubscription) {
    const bookings = await createConfirmedBookings({
      studentId: session.userId,
      professorId,
      matches: confirmedMatches,
      paymentStatus: "COVERED_BY_SUBSCRIPTION",
      priceCentsFor,
    });
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    redirect(sitePath(session.site, `/student/bookings?booked=${bookings.map((b) => b.id).join(",")}`));
  }

  if (!isStripeConfigured) {
    const bookings = await createConfirmedBookings({
      studentId: session.userId,
      professorId,
      matches: confirmedMatches,
      paymentStatus: "UNPAID",
      priceCentsFor,
    });
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    redirect(sitePath(session.site, `/student/bookings?booked=${bookings.map((b) => b.id).join(",")}`));
  }

  const pendingBookings = await prisma.$transaction(
    confirmedMatches.map((slot) =>
      prisma.booking.create({
        data: {
          studentId: session.userId,
          professorId,
          startAt: slot.startAt,
          endAt: slot.endAt,
          status: "PENDING",
          paymentStatus: "UNPAID",
          priceCents: priceCentsFor(slot),
        },
      })
    )
  );

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
    line_items: pendingBookings.map((booking, i) => ({
      price_data: {
        currency: "usd",
        unit_amount: booking.priceCents,
        product_data: {
          name: `${confirmedMatches[i].sessionLengthMinutes}-minute session with ${professor.name} — ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(confirmedMatches[i].startAt)}`,
        },
      },
      quantity: 1,
    })),
    success_url: `${appUrl}${sitePath(session.site, `/student/bookings?booked=${pendingBookings.map((b) => b.id).join(",")}`)}`,
    cancel_url: `${appUrl}${sitePath(session.site, `/student/professors/${professorId}?cancelled=1`)}`,
    metadata: { bookingIds: pendingBookings.map((b) => b.id).join(","), type: "booking" },
  });

  await prisma.booking.updateMany({
    where: { id: { in: pendingBookings.map((b) => b.id) } },
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

  await logAudit({
    site: session.site,
    action: "BOOKING_CANCELLED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: bookingId,
    detail: `Cancelled by ${session.role.toLowerCase()}`,
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

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking || booking.professorId !== session.userId) return;

  const wasAlreadyCompleted = booking.status === "COMPLETED";

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  if (booking.isDemo && !wasAlreadyCompleted) {
    await sendDemoFollowUpEmail(booking);
  }

  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/student/bookings"));
}
