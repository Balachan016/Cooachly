"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/dal";

const ProfessorProfileSchema = z.object({
  headline: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(2000).default(""),
  subject: z.string().trim().max(120).default(""),
  hourlyRateCents: z.coerce.number().int().min(0).max(100000000),
  monthlyPriceCents: z.union([z.coerce.number().int().min(0).max(100000000), z.nan()]).optional(),
});

export async function updateProfessorProfile(_state: unknown, formData: FormData) {
  const session = await requireRole("PROFESSOR");

  const rawMonthly = formData.get("monthlyPriceCents");
  const parsed = ProfessorProfileSchema.safeParse({
    headline: formData.get("headline"),
    bio: formData.get("bio"),
    subject: formData.get("subject"),
    hourlyRateCents: formData.get("hourlyRateCents"),
    monthlyPriceCents: rawMonthly ? rawMonthly : NaN,
  });

  if (!parsed.success) {
    return { message: "Please check the form fields and try again." };
  }

  const { headline, bio, subject, hourlyRateCents, monthlyPriceCents } = parsed.data;

  await prisma.professorProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      headline,
      bio,
      subject,
      hourlyRateCents,
      monthlyPriceCents: Number.isNaN(monthlyPriceCents) ? null : monthlyPriceCents,
    },
    update: {
      headline,
      bio,
      subject,
      hourlyRateCents,
      monthlyPriceCents: Number.isNaN(monthlyPriceCents) ? null : monthlyPriceCents,
    },
  });

  revalidatePath("/professor/profile");
  return { message: "Profile saved." };
}

const TimezoneSchema = z.object({ timezone: z.string().min(1) });

export async function updateTimezone(_state: unknown, formData: FormData) {
  const session = await requireSession();
  const parsed = TimezoneSchema.safeParse({ timezone: formData.get("timezone") });
  if (!parsed.success) return { message: "Invalid timezone." };

  await prisma.user.update({
    where: { id: session.userId },
    data: { timezone: parsed.data.timezone },
  });

  revalidatePath("/");
  return { message: "Timezone updated." };
}
