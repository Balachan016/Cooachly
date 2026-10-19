"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";

const AdminAvailabilitySchema = z
  .object({
    professorId: z.string().min(1, "Please select a professor."),
    mode: z.enum(["recurring", "oneTime"]).default("recurring"),
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().min(1),
    sessionLengthMinutes: z.coerce.number().int().refine((v) => [30, 45, 60, 75, 90].includes(v), {
      message: "Session length must be 30, 45, 60, 75, or 90 minutes.",
    }),
  })
  .refine((data) => (data.mode === "recurring" ? data.dayOfWeek !== undefined : Boolean(data.date)), {
    message: "Pick a day of week (weekly) or a date (one-time).",
  });

// Mirrors the same enforcement in actions/availability.ts — Arts classes are
// always 30 minutes regardless of who (professor or admin) adds the window.
const ARTS_SESSION_LENGTH_MINUTES = 30;

/**
 * Admin/superadmin: adds an availability window to a professor's own
 * schedule on their behalf — same Availability model and slot-generation
 * logic (lib/scheduling.ts) as the professor's own Availability page, just
 * scoped by an explicit professorId instead of the signed-in professor's id.
 */
export async function adminAddAvailability(formData: FormData) {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const parsed = AdminAvailabilitySchema.safeParse({
    professorId: formData.get("professorId"),
    mode: formData.get("mode") || undefined,
    dayOfWeek: formData.get("dayOfWeek") || undefined,
    date: formData.get("date") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
    sessionLengthMinutes: formData.get("sessionLengthMinutes"),
  });
  if (!parsed.success) return;

  const { professorId, mode, dayOfWeek, date, startTime, endTime, timezone } = parsed.data;
  if (startTime >= endTime) return;

  const professor = await prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR", site: session.site } });
  if (!professor) return;

  const sessionLengthMinutes = session.site === "ARTS" ? ARTS_SESSION_LENGTH_MINUTES : parsed.data.sessionLengthMinutes;

  await prisma.availability.create({
    data: {
      professorId,
      dayOfWeek: mode === "recurring" ? (dayOfWeek ?? null) : null,
      date: mode === "oneTime" && date ? new Date(`${date}T00:00:00.000Z`) : null,
      startTime,
      endTime,
      timezone,
      sessionLengthMinutes,
    },
  });

  revalidatePath(sitePath(session.site, "/admin/availability"));
  revalidatePath(sitePath(session.site, "/admin"));
}

export async function adminRemoveAvailability(id: string, professorId: string) {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  await prisma.availability.deleteMany({
    where: { id, professorId, professor: { site: session.site } },
  });

  revalidatePath(sitePath(session.site, "/admin/availability"));
  revalidatePath(sitePath(session.site, "/admin"));
}
