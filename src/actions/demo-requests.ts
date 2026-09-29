"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { sendDemoRequestScheduledEmail } from "@/lib/notifications/demo-requests";
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

  const updated = await prisma.demoRequest.update({
    where: { id },
    data: {
      status: "SCHEDULED",
      professorId: professor.id,
      scheduledAt,
      meetingLink: parsed.data.meetingLink || null,
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

  await sendDemoRequestScheduledEmail(updated);

  revalidatePath(sitePath(session.site, "/admin/demo-requests"));
  return { message: "Call scheduled.", success: true };
}

export async function updateDemoRequestStatus(id: string, status: DemoRequestStatus) {
  const session = await requireRole("ADMIN");

  const demoRequest = await prisma.demoRequest.findUnique({ where: { id } });
  if (!demoRequest || demoRequest.site !== session.site) return;

  const resolved = status === "JOINED" || status === "DROPPED";

  await prisma.demoRequest.update({
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

  revalidatePath(sitePath(session.site, "/admin/demo-requests"));
}
