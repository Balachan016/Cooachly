"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { provisionVideoRoomForBooking } from "@/lib/daily";
import { sendBookingConfirmation } from "@/lib/notifications/booking-confirmation";
import { logAudit } from "@/lib/audit";
import { sitePath } from "@/lib/site";

const SESSION_LENGTH_MINUTES = 60;
const MAX_DATE_RANGE_DAYS = 366;
// A sanity cap, not a product limit — a month of even a few weekly slots
// stays well under this; it exists so a mis-picked multi-year range with
// several daily slots can't queue up thousands of sequential DB writes.
const MAX_SESSIONS_PER_REQUEST = 200;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const BulkBookingSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  professorId: z.string().min(1, "Please select a professor."),
  subject: z.string().trim().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a start date."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick an end date."),
  timezone: z.string().min(1, "Please pick a timezone."),
});

type Slot = { dayOfWeek: number; time: string };
type BulkBookingResult = { when: string; status: "created" | "skipped"; reason?: string };

export type BulkBookingState = { message?: string; success?: true; results?: BulkBookingResult[] } | undefined;

/**
 * Admin/superadmin: generates one confirmed booking per matching weekday in
 * a date range for a single student/professor pair — e.g. "every Mon & Wed
 * at 4pm for the month of November" — instead of creating sessions one at a
 * time or hand-building an Import-schedule row per date. Day-of-week is read
 * off the plain calendar date (not shifted by the session timezone), same as
 * a human reading a calendar. Shares the no-double-booking check with
 * importBookingSchedule, and sends one grouped confirmation email covering
 * every session created in this batch instead of one per session.
 */
export async function createBulkBooking(_state: BulkBookingState, formData: FormData): Promise<BulkBookingState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const parsed = BulkBookingSchema.safeParse({
    studentId: formData.get("studentId"),
    professorId: formData.get("professorId"),
    subject: formData.get("subject") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please fill in the schedule details." };
  }
  const { studentId, professorId, subject, startDate, endDate, timezone } = parsed.data;

  const dayValues = formData.getAll("slotDay");
  const timeValues = formData.getAll("slotTime");
  const slots: Slot[] = [];
  for (let i = 0; i < dayValues.length; i++) {
    const dayOfWeek = Number(dayValues[i]);
    const time = String(timeValues[i] ?? "");
    if (Number.isInteger(dayOfWeek) && dayOfWeek >= 0 && dayOfWeek <= 6 && /^\d{2}:\d{2}$/.test(time)) {
      slots.push({ dayOfWeek, time });
    }
  }
  if (slots.length === 0) return { message: "Add at least one day and time for the recurring schedule." };

  const [student, professor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, role: "STUDENT", site: session.site } }),
    prisma.user.findUnique({
      where: { id: professorId, role: "PROFESSOR", site: session.site },
      include: { professorProfile: { select: { hourlyRateCents: true } } },
    }),
  ]);
  if (!student) return { message: "Selected student not found." };
  if (!professor) return { message: "Selected professor not found." };

  // Built at exact UTC midnight so day-stepping and day-of-week below are
  // immune to the server's own local timezone (and DST) — they operate on
  // the plain calendar dates the admin typed, not on a shifted instant.
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return { message: "End date must be on or after the start date." };
  }
  const totalDays = Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  if (totalDays > MAX_DATE_RANGE_DAYS) return { message: "That date range is too long — pick a shorter range." };

  const occurrences: { startAt: Date; when: string }[] = [];
  for (let i = 0; i < totalDays; i++) {
    const day = new Date(start.getTime() + i * MS_PER_DAY);
    const isoDate = day.toISOString().slice(0, 10);
    const dayOfWeek = day.getUTCDay();
    for (const slot of slots) {
      if (slot.dayOfWeek !== dayOfWeek) continue;
      let startAt: Date;
      try {
        startAt = fromZonedTime(`${isoDate}T${slot.time}:00`, timezone);
      } catch {
        return { message: `Unrecognized timezone "${timezone}".` };
      }
      if (Number.isNaN(startAt.getTime())) return { message: "Invalid date or time in the schedule." };
      occurrences.push({
        startAt,
        when: new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(startAt),
      });
    }
  }
  if (occurrences.length === 0) return { message: "No dates in that range match the selected day(s) of the week." };
  if (occurrences.length > MAX_SESSIONS_PER_REQUEST) {
    return {
      message: `That schedule would create ${occurrences.length} sessions — narrow the date range or pick fewer weekly slots (max ${MAX_SESSIONS_PER_REQUEST}).`,
    };
  }
  occurrences.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const hourlyRateCents = professor.professorProfile?.hourlyRateCents ?? 0;
  const notes = subject ? `Bulk-booked schedule: ${subject}` : "Bulk-booked schedule";

  const results: BulkBookingResult[] = [];
  const createdBookings: (Booking & { student: User; professor: User })[] = [];

  for (const occ of occurrences) {
    const endAt = new Date(occ.startAt.getTime() + SESSION_LENGTH_MINUTES * 60 * 1000);
    const [professorConflict, studentConflict] = await Promise.all([
      prisma.booking.findFirst({
        where: { professorId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: endAt }, endAt: { gt: occ.startAt } },
      }),
      prisma.booking.findFirst({
        where: { studentId, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: endAt }, endAt: { gt: occ.startAt } },
      }),
    ]);
    if (professorConflict || studentConflict) {
      results.push({
        when: occ.when,
        status: "skipped",
        reason: professorConflict ? "Professor already has a session at this time." : "Student already has a session at this time.",
      });
      continue;
    }

    const booking = await prisma.booking.create({
      data: {
        studentId,
        professorId,
        startAt: occ.startAt,
        endAt,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        priceCents: hourlyRateCents,
        notes,
      },
      include: { student: true, professor: true },
    });
    await provisionVideoRoomForBooking(booking);
    createdBookings.push(booking);
    results.push({ when: occ.when, status: "created" });
  }

  if (createdBookings.length > 0) {
    await sendBookingConfirmation(createdBookings);
    await logAudit({
      site: session.site,
      action: "BULK_BOOKING_CREATED",
      actorId: session.userId,
      detail: `Bulk-booked ${createdBookings.length} session(s) for ${student.name} with ${professor.name}, skipped ${results.length - createdBookings.length}`,
    });
    revalidatePath(sitePath(session.site, "/admin/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    revalidatePath(sitePath(session.site, "/student/bookings"));
  }

  const skippedCount = results.length - createdBookings.length;
  return {
    message: `Created ${createdBookings.length} session${createdBookings.length === 1 ? "" : "s"} for ${student.name} with ${professor.name}${skippedCount ? `, skipped ${skippedCount}` : ""}.`,
    ...(createdBookings.length > 0 ? { success: true as const } : {}),
    results,
  };
}
