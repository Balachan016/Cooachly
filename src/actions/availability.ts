"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";

const AvailabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
  sessionLengthMinutes: z.coerce.number().int().refine((v) => [30, 45, 60, 75, 90].includes(v), {
    message: "Session length must be 30, 45, 60, 75, or 90 minutes.",
  }),
});

// Cooachly Arts classes are fixed at 30 minutes — enforced here (not just in
// the Arts availability form) so a crafted request can't set another length.
const ARTS_SESSION_LENGTH_MINUTES = 30;

export async function addAvailability(formData: FormData) {
  const session = await requireRole("PROFESSOR");

  const parsed = AvailabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
    sessionLengthMinutes: formData.get("sessionLengthMinutes"),
  });

  if (!parsed.success) return;
  const { dayOfWeek, startTime, endTime, timezone } = parsed.data;
  const sessionLengthMinutes = session.site === "ARTS" ? ARTS_SESSION_LENGTH_MINUTES : parsed.data.sessionLengthMinutes;
  if (startTime >= endTime) return;

  await prisma.availability.create({
    data: { professorId: session.userId, dayOfWeek, startTime, endTime, timezone, sessionLengthMinutes },
  });

  revalidatePath(sitePath(session.site, "/professor/availability"));
}

export async function removeAvailability(availabilityId: string) {
  const session = await requireRole("PROFESSOR");

  await prisma.availability.deleteMany({
    where: { id: availabilityId, professorId: session.userId },
  });

  revalidatePath(sitePath(session.site, "/professor/availability"));
}
