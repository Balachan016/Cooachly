"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { isDailyConfigured, provisionVideoRoomForBooking } from "@/lib/daily";
import { sendBookingReminder } from "@/lib/notifications/reminders";

export type InstantCallState = { message?: string; success?: true } | undefined;

const InstantCallSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  professorId: z.string().min(1, "Please select a professor."),
  meetingLink: z.string().trim().optional(),
});

export async function startInstantCall(_state: InstantCallState, formData: FormData): Promise<InstantCallState> {
  await requireRole("ADMIN");

  const parsed = InstantCallSchema.safeParse({
    studentId: formData.get("studentId"),
    professorId: formData.get("professorId"),
    meetingLink: formData.get("meetingLink") || undefined,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please select a student and a professor." };
  }

  const { studentId, professorId, meetingLink } = parsed.data;

  const [student, professor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, role: "STUDENT" } }),
    prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR" } }),
  ]);
  if (!student) return { message: "Selected student not found." };
  if (!professor) return { message: "Selected professor not found." };

  const startAt = new Date();
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
      notes: "Instant call started by admin",
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

  revalidatePath("/admin/bookings");

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
