"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { generateTempPassword, hashPassword } from "@/lib/password";
import { DEMO_SESSION_LENGTH_MINUTES } from "@/lib/booking-rules";
import { sendDemoRequestScheduledEmail, sendDemoJoinedWelcomeEmail } from "@/lib/notifications/demo-requests";
import { sitePath } from "@/lib/site";
import type { DemoRequestStatus } from "@prisma/client";

const ScheduleDemoCallSchema = z.object({
  professorId: z.string().min(1, "Please choose a professor."),
  scheduledAt: z.string().min(1, "Please choose a date and time."),
  meetingLink: z.string().trim().optional(),
  adminNotes: z.string().trim().optional(),
});

export type ScheduleDemoCallState = { message?: string; success?: true } | undefined;

export async function scheduleDemoCall(
  id: string,
  _state: ScheduleDemoCallState,
  formData: FormData
): Promise<ScheduleDemoCallState> {
  const session = await requireRole("ADMIN");

  const demoRequest = await prisma.demoRequest.findUnique({ where: { id } });
  if (!demoRequest || demoRequest.site !== session.site) return { message: "Demo request not found." };

  const parsed = ScheduleDemoCallSchema.safeParse({
    professorId: formData.get("professorId"),
    scheduledAt: formData.get("scheduledAt"),
    meetingLink: formData.get("meetingLink") || undefined,
    adminNotes: formData.get("adminNotes") || undefined,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const scheduledAt = new Date(parsed.data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return { message: "Invalid date/time." };

  const professor = await prisma.user.findUnique({ where: { id: parsed.data.professorId, role: "PROFESSOR" } });
  if (!professor || professor.site !== session.site) return { message: "Professor not found." };

  const meetingLink = parsed.data.meetingLink || null;
  const endAt = new Date(scheduledAt.getTime() + DEMO_SESSION_LENGTH_MINUTES * 60_000);

  // Scheduling a demo call also creates (or updates) a real Booking row for
  // it, tagged isDemo, so it shows up in Bookings alongside paid sessions —
  // rescheduling the same demo request updates that one booking instead of
  // creating a duplicate.
  const existingBooking = await prisma.booking.findUnique({ where: { demoRequestId: id } });
  let newAccountTempPassword: string | undefined;

  if (existingBooking) {
    await prisma.booking.update({
      where: { id: existingBooking.id },
      data: { professorId: professor.id, startAt: scheduledAt, endAt, meetingLink },
    });
  } else {
    let student = await prisma.user.findUnique({ where: { site_email: { site: session.site, email: demoRequest.email } } });
    if (student && student.role !== "STUDENT") {
      return { message: "This email already has a non-student account on this platform — please resolve manually." };
    }
    if (!student) {
      newAccountTempPassword = generateTempPassword();
      student = await prisma.user.create({
        data: {
          site: session.site,
          name: demoRequest.name,
          email: demoRequest.email,
          phone: demoRequest.phone,
          passwordHash: await hashPassword(newAccountTempPassword),
          role: "STUDENT",
          timezone: demoRequest.timezone || "UTC",
        },
      });
    }

    await prisma.booking.create({
      data: {
        studentId: student.id,
        professorId: professor.id,
        startAt: scheduledAt,
        endAt,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        isDemo: true,
        priceCents: 0,
        meetingLink,
        demoRequestId: id,
      },
    });
  }

  const updated = await prisma.demoRequest.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      professorId: professor.id,
      scheduledAt,
      meetingLink,
      adminNotes: parsed.data.adminNotes || null,
    },
    include: { professor: true },
  });

  await logAudit({
    site: session.site,
    action: "DEMO_REQUEST_SCHEDULED",
    actorId: session.userId,
    targetType: "DemoRequest",
    targetId: id,
    detail: `${updated.email} with ${professor.name} at ${scheduledAt.toISOString()}`,
  });

  await sendDemoRequestScheduledEmail(updated, { newAccountTempPassword });

  revalidatePath(sitePath(session.site, "/admin/demo-requests"));
  revalidatePath(sitePath(session.site, "/admin/bookings"));
  revalidatePath(sitePath(session.site, "/professor/bookings"));
  revalidatePath(sitePath(session.site, "/student/bookings"));
  return { message: "Call scheduled.", success: true };
}

export async function updateDemoRequestStatus(id: string, status: DemoRequestStatus) {
  const session = await requireRole("ADMIN");

  const demoRequest = await prisma.demoRequest.findUnique({ where: { id } });
  if (!demoRequest || demoRequest.site !== session.site) return;

  const resolved = status === "JOINED" || status === "DROPPED";
  const justJoined = status === "JOINED" && demoRequest.status !== "JOINED";

  const updated = await prisma.demoRequest.update({
    where: { id },
    data: { status, resolvedAt: resolved ? new Date() : null },
  });

  await logAudit({
    site: session.site,
    action: "DEMO_REQUEST_STATUS_CHANGED",
    actorId: session.userId,
    targetType: "DemoRequest",
    targetId: id,
    detail: `${demoRequest.email}: ${demoRequest.status} → ${status}`,
  });

  // Marking a demo JOINED means the lead actually showed up and converted —
  // send them a proper welcome-aboard email with a secure link to set their
  // own login, closing out the request.
  if (justJoined) {
    await sendDemoJoinedWelcomeEmail(updated);
  }

  revalidatePath(sitePath(session.site, "/admin/demo-requests"));
}
