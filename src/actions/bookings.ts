"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startOfMonth, endOfMonth } from "date-fns";
import type { AvailableSlot, CalendarDay } from "@/lib/scheduling";
import type { PaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { getAvailableSlots, buildCalendarWeeks, SESSION_LENGTH_MINUTES, BOOKING_WINDOW_DAYS } from "@/lib/scheduling";
import { MIN_SLOTS_PER_BOOKING, MAX_SLOTS_PER_BOOKING, MAX_RESCHEDULES_PER_MONTH } from "@/lib/booking-rules";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { provisionVideoRoomForBooking, updateDailyRoomExpiry } from "@/lib/daily";
import { sendDemoFollowUpEmail } from "@/lib/notifications/demo-followup";
import { sendBookingConfirmation, sendBookingRescheduledEmail } from "@/lib/notifications/booking-confirmation";
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

async function monthlyReschedulesUsed(studentId: string, asOf: Date) {
  return prisma.booking.count({
    where: { studentId, rescheduledAt: { gte: startOfMonth(asOf), lte: endOfMonth(asOf) } },
  });
}

export type RescheduleOptions =
  | { eligible: true; weeks: (CalendarDay | null)[][]; timezone: string; remaining: number; limit: number }
  | { eligible: false; message: string };

/**
 * Fetched when the student opens the reschedule picker for a booking —
 * checks eligibility (not past/cancelled/completed, under the monthly quota)
 * and, if eligible, returns the same professor's open slots for them to pick
 * a new time from.
 */
export async function getRescheduleOptions(bookingId: string): Promise<RescheduleOptions> {
  const session = await requireRole("STUDENT");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { student: true } });
  if (!booking || booking.studentId !== session.userId) return { eligible: false, message: "Booking not found." };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { eligible: false, message: "This booking can no longer be rescheduled." };
  }
  if (booking.startAt.getTime() <= Date.now()) {
    return { eligible: false, message: "This session has already started." };
  }

  const used = await monthlyReschedulesUsed(session.userId, new Date());
  const remaining = Math.max(0, MAX_RESCHEDULES_PER_MONTH - used);
  if (remaining <= 0) {
    return {
      eligible: false,
      message: `You've used your ${MAX_RESCHEDULES_PER_MONTH} reschedule${MAX_RESCHEDULES_PER_MONTH === 1 ? "" : "s"} for this calendar month. Try again next month.`,
    };
  }

  const slots = await getAvailableSlots(booking.professorId);
  const weeks = buildCalendarWeeks(slots, booking.student.timezone, BOOKING_WINDOW_DAYS);
  return { eligible: true, weeks, timezone: booking.student.timezone, remaining, limit: MAX_RESCHEDULES_PER_MONTH };
}

export type RescheduleFormState = { message?: string; success?: true } | undefined;

/**
 * Moves a booking to a new time with the same professor, freeing its old
 * slot (slot availability is derived live from each booking's startAt/endAt,
 * so updating them is all "freeing" the old slot requires) and consuming one
 * of the student's MAX_RESCHEDULES_PER_MONTH reschedules for this calendar
 * month.
 */
export async function rescheduleBooking(_state: RescheduleFormState, formData: FormData): Promise<RescheduleFormState> {
  const session = await requireRole("STUDENT");

  const bookingId = String(formData.get("bookingId") ?? "");
  const newStartAt = String(formData.get("newStartAt") ?? "");
  if (!bookingId || !newStartAt) return { message: "Invalid reschedule request." };

  const newStartDate = new Date(newStartAt);
  if (Number.isNaN(newStartDate.getTime())) return { message: "Invalid time selected." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking || booking.studentId !== session.userId) return { message: "Booking not found." };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { message: "This booking can no longer be rescheduled." };
  }
  if (booking.startAt.getTime() <= Date.now()) {
    return { message: "This session has already started." };
  }

  const used = await monthlyReschedulesUsed(session.userId, new Date());
  if (used >= MAX_RESCHEDULES_PER_MONTH) {
    return {
      message: `You've used your ${MAX_RESCHEDULES_PER_MONTH} reschedule${MAX_RESCHEDULES_PER_MONTH === 1 ? "" : "s"} for this calendar month. Try again next month.`,
    };
  }

  const slots = await getAvailableSlots(booking.professorId);
  const match = slots.find((s) => s.startAt.getTime() === newStartDate.getTime());
  if (!match) return { message: "That time is no longer available. Please pick another." };

  const previousStartAt = booking.startAt;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { startAt: match.startAt, endAt: match.endAt, rescheduledAt: new Date() },
    include: { student: true, professor: true },
  });

  if (updated.dailyRoomName) {
    const newExp = Math.floor(updated.endAt.getTime() / 1000) + 2 * 60 * 60; // same 2h wrap-up buffer as room creation
    await updateDailyRoomExpiry(updated.dailyRoomName, newExp);
  }

  await sendBookingRescheduledEmail(updated, previousStartAt);

  await logAudit({
    site: session.site,
    action: "BOOKING_RESCHEDULED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: booking.id,
    detail: `${previousStartAt.toISOString()} → ${match.startAt.toISOString()}`,
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));

  return { message: "Session rescheduled.", success: true };
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
