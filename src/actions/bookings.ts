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
import { sendFeedbackRequestEmails } from "@/lib/notifications/feedback-request";
import {
  sendBookingConfirmation,
  sendBookingRescheduledEmail,
  sendBookingDeletedEmail,
  sendBookingCancelledEmail,
  sendRescheduleProposedEmail,
  sendRescheduleDeclinedEmail,
} from "@/lib/notifications/booking-confirmation";
import { formatWhenFor } from "@/lib/notifications/format";
import { logAudit } from "@/lib/audit";
import { sitePath } from "@/lib/site";
import { getAppUrl } from "@/lib/url";

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

  const appUrl = await getAppUrl();

  // Stripe calls are kept out of the surrounding redirect()'s control flow
  // (redirect() throws internally to unwind the action — if these were in
  // the same try block, a genuine Stripe failure couldn't be told apart
  // from a successful redirect). On failure, the PENDING bookings created
  // above are cancelled so their slots free up instead of being stuck
  // PENDING forever with no checkout session to complete them.
  let checkoutUrl: string;
  try {
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
            name: `${confirmedMatches[i].sessionLengthMinutes}-minute session with ${professor.name} — ${formatWhenFor(confirmedMatches[i].startAt, student?.timezone ?? "UTC")}`,
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

    checkoutUrl = checkoutSession.url ?? `${appUrl}${sitePath(session.site, "/student/bookings")}`;
  } catch (err) {
    console.error("Failed to create Stripe checkout session for booking", err);
    await prisma.booking.updateMany({
      where: { id: { in: pendingBookings.map((b) => b.id) } },
      data: { status: "CANCELLED" },
    });
    return { message: "We couldn't start checkout for your sessions. Please try again in a moment." };
  }

  redirect(checkoutUrl);
}

export type CancelBookingState = { message?: string; success?: true } | undefined;

/**
 * Cancels a booking at the student's or professor's request. Requires a
 * reason, which (along with who cancelled) is logged to the audit trail and
 * emailed to the student, professor, and admins — nobody should find out a
 * session vanished without knowing why.
 */
export async function cancelBooking(_state: CancelBookingState, formData: FormData): Promise<CancelBookingState> {
  const session = await requireRole("STUDENT", "PROFESSOR");

  const bookingId = String(formData.get("bookingId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!bookingId) return { message: "Invalid cancellation request." };
  if (!reason) return { message: "Please let us know why you're cancelling." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking) return { message: "Booking not found." };
  if (booking.studentId !== session.userId && booking.professorId !== session.userId) {
    return { message: "You weren't part of this session." };
  }
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { message: "This booking can no longer be cancelled." };
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  const cancelledByName = session.role === "STUDENT" ? booking.student.name : booking.professor.name;
  await sendBookingCancelledEmail(booking, { cancelledByName, reason });

  await logAudit({
    site: session.site,
    action: "BOOKING_CANCELLED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: bookingId,
    detail: `Cancelled by ${session.role.toLowerCase()}: ${reason}`,
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));

  return { message: "Session cancelled.", success: true };
}

/**
 * Superadmin-only: cancels any scheduled (PENDING/CONFIRMED) booking on
 * either site, with a required reason — unlike deleteBooking, this keeps
 * the row (just flips status) and, since getAvailableSlots only counts
 * PENDING/CONFIRMED bookings as occupying a slot, immediately frees that
 * time for someone else to book. Emails the student, professor, and admins,
 * same as a self-service cancellation.
 */
export async function superadminCancelBooking(
  _state: CancelBookingState,
  formData: FormData
): Promise<CancelBookingState> {
  const session = await requireRole("SUPERADMIN");

  const bookingId = String(formData.get("bookingId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!bookingId) return { message: "Invalid cancellation request." };
  if (!reason) return { message: "Please enter a reason for cancelling this booking." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking) return { message: "Booking not found." };
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { message: "Only scheduled (pending or confirmed) bookings can be cancelled this way." };
  }

  const bookingSite = booking.professor.site;

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
  });

  await sendBookingCancelledEmail(booking, { cancelledByName: `${session.name} (admin)`, reason });

  await logAudit({
    site: bookingSite,
    action: "BOOKING_CANCELLED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: bookingId,
    detail: `Cancelled by superadmin ${session.name}: ${reason}`,
  });

  revalidatePath(sitePath(bookingSite, "/student/bookings"));
  revalidatePath(sitePath(bookingSite, "/professor/bookings"));
  revalidatePath(sitePath(bookingSite, "/admin/bookings"));
  revalidatePath("/superadmin/bookings");

  return { message: "Session cancelled — the slot is now open for others to book.", success: true };
}

/**
 * Superadmin-only: permanently deletes a confirmed booking (as opposed to
 * cancelBooking, which just flips its status and keeps the row) and emails
 * the student and professor that it was removed, CC'd to admins. Per the
 * schema's cascade rules this also deletes the booking's attachments,
 * reviews, and notification logs; any message thread tied to it keeps its
 * messages but loses the booking reference.
 */
export async function deleteBooking(bookingId: string) {
  const session = await requireRole("SUPERADMIN");

  // A superadmin oversees both sites (unlike a plain ADMIN, who's confined
  // to their own), so this deliberately doesn't check booking.professor.site
  // against session.site — they can delete a confirmed booking on either
  // platform.
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking) return;
  if (booking.status !== "CONFIRMED") return;

  const bookingSite = booking.professor.site;

  await prisma.booking.delete({ where: { id: bookingId } });

  await sendBookingDeletedEmail(booking);

  await logAudit({
    site: bookingSite,
    action: "BOOKING_DELETED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: bookingId,
    detail: `${booking.student.name} with ${booking.professor.name} at ${booking.startAt.toISOString()}`,
  });

  revalidatePath(sitePath(bookingSite, "/admin/bookings"));
  revalidatePath(sitePath(bookingSite, "/student/bookings"));
  revalidatePath(sitePath(bookingSite, "/professor/bookings"));
  revalidatePath("/superadmin/bookings");
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
  const session = await requireRole("STUDENT", "PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { student: true, professor: true } });
  const isOwner =
    session.role === "STUDENT" ? booking?.studentId === session.userId : booking?.professorId === session.userId;
  if (!booking || !isOwner) return { eligible: false, message: "Booking not found." };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { eligible: false, message: "This booking can no longer be rescheduled." };
  }
  if (booking.startAt.getTime() <= Date.now()) {
    return { eligible: false, message: "This session has already started." };
  }
  if (booking.rescheduleProposedStartAt) {
    return { eligible: false, message: "There's already a pending reschedule proposal on this session — resolve it first." };
  }

  // The reschedule quota exists to bound how often a student can shuffle
  // their own sessions — it doesn't apply when the professor is the one
  // moving a session they're managing.
  let remaining = MAX_RESCHEDULES_PER_MONTH;
  if (session.role === "STUDENT") {
    const used = await monthlyReschedulesUsed(session.userId, new Date());
    remaining = Math.max(0, MAX_RESCHEDULES_PER_MONTH - used);
    if (remaining <= 0) {
      return {
        eligible: false,
        message: `You've used your ${MAX_RESCHEDULES_PER_MONTH} reschedule${MAX_RESCHEDULES_PER_MONTH === 1 ? "" : "s"} for this calendar month. Try again next month.`,
      };
    }
  }

  const viewerTimezone = session.role === "STUDENT" ? booking.student.timezone : booking.professor.timezone;
  const slots = await getAvailableSlots(booking.professorId);
  const weeks = buildCalendarWeeks(slots, viewerTimezone, BOOKING_WINDOW_DAYS);
  return { eligible: true, weeks, timezone: viewerTimezone, remaining, limit: MAX_RESCHEDULES_PER_MONTH };
}

export type RescheduleFormState = { message?: string; success?: true } | undefined;

/**
 * Proposes moving a booking to a new time — doesn't move it yet. The other
 * party (student ↔ professor) must accept via acceptRescheduleProposal
 * before startAt/endAt actually change and the student's monthly quota is
 * consumed; declineRescheduleProposal leaves everything as it was.
 */
export async function proposeReschedule(_state: RescheduleFormState, formData: FormData): Promise<RescheduleFormState> {
  const session = await requireRole("STUDENT", "PROFESSOR");

  const bookingId = String(formData.get("bookingId") ?? "");
  const newStartAt = String(formData.get("newStartAt") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!bookingId || !newStartAt) return { message: "Invalid reschedule request." };
  if (!reason) return { message: "Please let us know why you're rescheduling." };

  const newStartDate = new Date(newStartAt);
  if (Number.isNaN(newStartDate.getTime())) return { message: "Invalid time selected." };

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  const isOwner =
    session.role === "STUDENT" ? booking?.studentId === session.userId : booking?.professorId === session.userId;
  if (!booking || !isOwner) return { message: "Booking not found." };
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { message: "This booking can no longer be rescheduled." };
  }
  if (booking.startAt.getTime() <= Date.now()) {
    return { message: "This session has already started." };
  }
  if (booking.rescheduleProposedStartAt) {
    return { message: "There's already a pending reschedule proposal on this session." };
  }

  if (session.role === "STUDENT") {
    const used = await monthlyReschedulesUsed(session.userId, new Date());
    if (used >= MAX_RESCHEDULES_PER_MONTH) {
      return {
        message: `You've used your ${MAX_RESCHEDULES_PER_MONTH} reschedule${MAX_RESCHEDULES_PER_MONTH === 1 ? "" : "s"} for this calendar month. Try again next month.`,
      };
    }
  }

  const slots = await getAvailableSlots(booking.professorId);
  const match = slots.find((s) => s.startAt.getTime() === newStartDate.getTime());
  if (!match) return { message: "That time is no longer available. Please pick another." };

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      rescheduleProposedStartAt: match.startAt,
      rescheduleProposedBy: session.role,
      rescheduleProposedReason: reason,
      rescheduleProposedAt: new Date(),
    },
    include: { student: true, professor: true },
  });

  await sendRescheduleProposedEmail(updated, {
    proposedBy: session.role as "STUDENT" | "PROFESSOR",
    proposedStartAt: match.startAt,
    reason,
  });

  await logAudit({
    site: session.site,
    action: "BOOKING_RESCHEDULE_PROPOSED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: booking.id,
    detail: `${booking.startAt.toISOString()} → ${match.startAt.toISOString()} proposed (by ${session.role.toLowerCase()}: ${reason})`,
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));

  return { message: "Reschedule proposed — waiting for the other party to respond.", success: true };
}

/**
 * Accepts a pending reschedule proposal — only the party who did NOT
 * propose it can accept. Moves the booking, consumes the student's monthly
 * quota when a student was the one who proposed it, and clears the
 * proposal fields.
 */
export async function acceptRescheduleProposal(bookingId: string): Promise<RescheduleFormState> {
  const session = await requireRole("STUDENT", "PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { student: true, professor: true } });
  const isOwner =
    session.role === "STUDENT" ? booking?.studentId === session.userId : booking?.professorId === session.userId;
  if (!booking || !isOwner) return { message: "Booking not found." };
  if (!booking.rescheduleProposedStartAt || !booking.rescheduleProposedBy || !booking.rescheduleProposedReason) {
    return { message: "There's no pending proposal to accept." };
  }
  if (booking.rescheduleProposedBy === session.role) {
    return { message: "Waiting on the other party to respond to your own proposal." };
  }
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    return { message: "This booking can no longer be rescheduled." };
  }
  if (booking.startAt.getTime() <= Date.now()) {
    return { message: "This session has already started." };
  }

  if (booking.rescheduleProposedBy === "STUDENT") {
    const used = await monthlyReschedulesUsed(booking.studentId, new Date());
    if (used >= MAX_RESCHEDULES_PER_MONTH) {
      return {
        message: `The student has used their ${MAX_RESCHEDULES_PER_MONTH} reschedule${MAX_RESCHEDULES_PER_MONTH === 1 ? "" : "s"} for this calendar month.`,
      };
    }
  }

  const proposedStartAt = booking.rescheduleProposedStartAt;
  const proposedBy = booking.rescheduleProposedBy;
  const proposedReason = booking.rescheduleProposedReason;

  const slots = await getAvailableSlots(booking.professorId);
  const match = slots.find((s) => s.startAt.getTime() === proposedStartAt.getTime());
  if (!match) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        rescheduleProposedStartAt: null,
        rescheduleProposedBy: null,
        rescheduleProposedReason: null,
        rescheduleProposedAt: null,
      },
    });
    revalidatePath(sitePath(session.site, "/student/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    revalidatePath(sitePath(session.site, "/admin/bookings"));
    return { message: "That proposed time is no longer available. The proposal has been cleared — please propose a new time." };
  }

  const previousStartAt = booking.startAt;
  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      startAt: match.startAt,
      endAt: match.endAt,
      rescheduledAt: new Date(),
      rescheduleProposedStartAt: null,
      rescheduleProposedBy: null,
      rescheduleProposedReason: null,
      rescheduleProposedAt: null,
    },
    include: { student: true, professor: true },
  });

  if (updated.dailyRoomName) {
    const newExp = Math.floor(updated.endAt.getTime() / 1000) + 2 * 60 * 60; // same 2h wrap-up buffer as room creation
    await updateDailyRoomExpiry(updated.dailyRoomName, newExp);
  }

  await sendBookingRescheduledEmail(updated, previousStartAt, {
    requestedBy: proposedBy as "STUDENT" | "PROFESSOR",
    reason: proposedReason,
  });

  await logAudit({
    site: session.site,
    action: "BOOKING_RESCHEDULED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: booking.id,
    detail: `${previousStartAt.toISOString()} → ${match.startAt.toISOString()} accepted by ${session.role.toLowerCase()} (proposed by ${proposedBy.toLowerCase()}: ${proposedReason})`,
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));

  return { message: "Reschedule accepted — session moved.", success: true };
}

/**
 * Declines (or, if called by the proposer themselves, withdraws) a pending
 * reschedule proposal, leaving the booking at its current time. Either
 * party to the booking can call this.
 */
export async function declineRescheduleProposal(bookingId: string): Promise<RescheduleFormState> {
  const session = await requireRole("STUDENT", "PROFESSOR");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { student: true, professor: true } });
  const isOwner =
    session.role === "STUDENT" ? booking?.studentId === session.userId : booking?.professorId === session.userId;
  if (!booking || !isOwner) return { message: "Booking not found." };
  if (!booking.rescheduleProposedStartAt || !booking.rescheduleProposedBy) {
    return { message: "There's no pending proposal to decline." };
  }

  const wasProposer = booking.rescheduleProposedBy === session.role;
  const proposedStartAt = booking.rescheduleProposedStartAt;
  const proposedBy = booking.rescheduleProposedBy as "STUDENT" | "PROFESSOR";

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      rescheduleProposedStartAt: null,
      rescheduleProposedBy: null,
      rescheduleProposedReason: null,
      rescheduleProposedAt: null,
    },
    include: { student: true, professor: true },
  });

  if (!wasProposer) {
    await sendRescheduleDeclinedEmail(updated, { proposedBy, proposedStartAt, declinedByName: session.name });
  }

  await logAudit({
    site: session.site,
    action: "BOOKING_RESCHEDULE_DECLINED",
    actorId: session.userId,
    targetType: "Booking",
    targetId: booking.id,
    detail: `Proposal for ${proposedStartAt.toISOString()} ${wasProposer ? "withdrawn by proposer" : "declined"} (${session.role.toLowerCase()}: ${session.name})`,
  });

  revalidatePath(sitePath(session.site, "/student/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));

  return { message: wasProposer ? "Proposal withdrawn." : "Proposal declined.", success: true };
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

/**
 * Professors mark their own bookings completed; an admin/superadmin can also
 * close out any booking on their site directly — mainly for instant calls,
 * which otherwise only reach Class logs once the professor remembers to mark
 * them complete (or the Daily transcript webhook does it automatically,
 * which depends on transcription being configured).
 */
export async function markBookingCompleted(bookingId: string) {
  const session = await requireRole("PROFESSOR", "ADMIN", "SUPERADMIN");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: true, professor: true },
  });
  if (!booking) return;
  // A superadmin oversees both sites, so (unlike ADMIN) isn't confined to
  // session.site here either.
  const allowed =
    session.role === "PROFESSOR"
      ? booking.professorId === session.userId
      : session.role === "SUPERADMIN"
        ? true
        : booking.professor.site === session.site;
  if (!allowed) return;

  const bookingSite = booking.professor.site;
  const wasAlreadyCompleted = booking.status === "COMPLETED";

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED" },
  });

  if (!wasAlreadyCompleted) {
    if (booking.isDemo) {
      await sendDemoFollowUpEmail(booking);
    } else {
      await sendFeedbackRequestEmails(booking);
    }
  }

  revalidatePath(sitePath(bookingSite, "/professor/bookings"));
  revalidatePath(sitePath(bookingSite, "/student/bookings"));
  revalidatePath(sitePath(bookingSite, "/admin/bookings"));
  revalidatePath(sitePath(bookingSite, "/admin/class-logs"));
}
