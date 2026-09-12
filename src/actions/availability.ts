"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";

const AvailabilitySchema = z.object({
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  timezone: z.string().min(1),
});

export async function addAvailability(formData: FormData) {
  const session = await requireRole("PROFESSOR");

  const parsed = AvailabilitySchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
  });

  if (!parsed.success) return;
  const { dayOfWeek, startTime, endTime, timezone } = parsed.data;
  if (startTime >= endTime) return;

  await prisma.availability.create({
    data: { professorId: session.userId, dayOfWeek, startTime, endTime, timezone },
  });

  revalidatePath("/professor/availability");
}

export async function removeAvailability(availabilityId: string) {
  const session = await requireRole("PROFESSOR");

  await prisma.availability.deleteMany({
    where: { id: availabilityId, professorId: session.userId },
  });

  revalidatePath("/professor/availability");
}
