"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { isDailyConfigured, provisionVideoRoomForBooking } from "@/lib/daily";
import { sendBookingReminder } from "@/lib/notifications/reminders";
import { sendBookingConfirmation } from "@/lib/notifications/booking-confirmation";
import { formatWhenFor } from "@/lib/notifications/format";
import { sitePath } from "@/lib/site";

export type InstantCallState = { message?: string; success?: true } | undefined;

const InstantCallSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  professorId: z.string().min(1, "Please select a professor."),
  meetingLink: z.string().trim().optional(),
  startAt: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});

/**
 * Admin-only: creates a confirmed session directly, with no availability or
 * slot-matching check — either starting right now (leave startAt blank, the
 * original "instant call" behavior) or at any admin-picked future date/time,
 * same as adminRescheduleBooking's no-restrictions approach to moving a
 * booking. A scheduled (non-instant) session gets the normal booking
 * confirmation email instead of the "starting now" instant reminder.
 */
export async function startInstantCall(_state: InstantCallState, formData: FormData): Promise<InstantCallState> {
  const session = await requireRole("ADMIN");

  const parsed = InstantCallSchema.safeParse({
    studentId: formData.get("studentId"),
    professorId: formData.get("professorId"),
    meetingLink: formData.get("meetingLink") || undefined,
    startAt: formData.get("startAt") || undefined,
    timezone: formData.get("timezone") || undefined,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please select a student and a professor." };
  }

  const { studentId, professorId, meetingLink, startAt: startAtRaw, timezone } = parsed.data;

  const [student, professor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, role: "STUDENT", site: session.site } }),
    prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR", site: session.site } }),
  ]);
  if (!student) return { message: "Selected student not found." };
  if (!professor) return { message: "Selected professor not found." };

  const isInstant = !startAtRaw;
  let startAt: Date;
  if (isInstant) {
    startAt = new Date();
  } else {
    if (!timezone) return { message: "Please pick a timezone for the scheduled date/time." };
    try {
      startAt = fromZonedTime(`${startAtRaw}:00`, timezone);
    } catch {
      return { message: "Invalid date/time or timezone." };
    }
    if (Number.isNaN(startAt.getTime())) return { message: "Invalid date/time." };
  }
  const endAt = new Date(startAt.getTime() + 60 * 60 * 1000);

  const booking = await prisma.booking.create({
    data: {
      studentId,
      professorId,
      startAt,
      endAt,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      priceCents: 0,
      notes: isInstant ? "Instant call started by admin" : "Session created directly by admin",
      meetingLink: meetingLink || null,
    },
  });

  if (isDailyConfigured) {
    await provisionVideoRoomForBooking(booking);
  }

  const fullBooking = await prisma.booking.findUnique({
    where: { id: booking.id },
    include: { student: true, professor: true },
  });

  revalidatePath(sitePath(session.site, "/admin/bookings"));

  if (!isInstant) {
    if (fullBooking) await sendBookingConfirmation([fullBooking]);
    return {
      message: `Session scheduled for ${formatWhenFor(startAt, student.timezone)} — confirmation emailed to ${student.name} and ${professor.name}.`,
      success: true,
    };
  }

  if (!fullBooking?.meetingLink) {
    return {
      message:
        "Call created, but no video link is set (Daily.co isn't configured). Add a meeting link on the Bookings page, then use \"Send reminder now\" to notify both.",
      success: true,
    };
  }

  await sendBookingReminder(fullBooking, "instant");

  return {
    message: `Call started — the join link was emailed${student.phone || professor.phone ? " and sent via WhatsApp" : ""} to ${student.name} and ${professor.name}.`,
    success: true,
  };
}
