"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSession } from "@/lib/dal";
import { sitePath } from "@/lib/site";

const ProfessorProfileSchema = z.object({
  headline: z.string().trim().max(120).default(""),
  bio: z.string().trim().max(2000).default(""),
  subject: z.string().trim().max(120).default(""),
  hourlyRateCents: z.coerce.number().int().min(0).max(100000000),
  monthlyPriceCents: z.union([z.coerce.number().int().min(0).max(100000000), z.nan()]).optional(),
  curricula: z.array(z.string().trim().min(1)).default([]),
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
    curricula: formData.getAll("curricula"),
  });

  if (!parsed.success) {
    return { message: "Please check the form fields and try again." };
  }

  const { headline, bio, subject, hourlyRateCents, monthlyPriceCents, curricula } = parsed.data;

  await prisma.professorProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      headline,
      bio,
      subject,
      hourlyRateCents,
      monthlyPriceCents: Number.isNaN(monthlyPriceCents) ? null : monthlyPriceCents,
      curricula,
    },
    update: {
      headline,
      bio,
      subject,
      hourlyRateCents,
      monthlyPriceCents: Number.isNaN(monthlyPriceCents) ? null : monthlyPriceCents,
      curricula,
    },
  });

  revalidatePath(sitePath(session.site, "/professor/profile"));
  return { message: "Profile saved." };
}

const ContactInfoSchema = z.object({
  timezone: z.string().min(1),
  phone: z.string().trim().optional(),
});

export async function updateContactInfo(_state: unknown, formData: FormData) {
  const session = await requireSession();
  const parsed = ContactInfoSchema.safeParse({
    timezone: formData.get("timezone"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) return { message: "Please check the form fields." };

  await prisma.user.update({
    where: { id: session.userId },
    data: { timezone: parsed.data.timezone, phone: parsed.data.phone || null },
  });

  revalidatePath(sitePath(session.site, "/professor/profile"));
  revalidatePath(sitePath(session.site, "/student"));
  return { message: "Contact info updated." };
}
