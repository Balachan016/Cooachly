"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import type { Role } from "@prisma/client";

export async function setUserRole(userId: string, role: Role) {
  await requireRole("ADMIN");
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin/users");
}

export async function setUserActive(userId: string, isActive: boolean) {
  const session = await requireRole("ADMIN");
  if (session.userId === userId) return;
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath("/admin/users");
}

const UserDetailsSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  parentName: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  timezone: z.string().min(1),
  headline: z.string().trim().max(120).optional(),
  bio: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(120).optional(),
  hourlyRateCents: z.union([z.coerce.number().int().min(0).max(100000000), z.nan()]).optional(),
  monthlyPriceCents: z.union([z.coerce.number().int().min(0).max(100000000), z.nan()]).optional(),
});

export async function updateUserDetailsAsAdmin(userId: string, _state: unknown, formData: FormData) {
  await requireRole("ADMIN");

  const parsed = UserDetailsSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    parentName: formData.get("parentName") || undefined,
    parentPhone: formData.get("parentPhone") || undefined,
    timezone: formData.get("timezone"),
    headline: formData.get("headline") || undefined,
    bio: formData.get("bio") || undefined,
    subject: formData.get("subject") || undefined,
    hourlyRateCents: formData.get("hourlyRateCents") || NaN,
    monthlyPriceCents: formData.get("monthlyPriceCents") || NaN,
  });

  if (!parsed.success) {
    return { message: "Please check the form fields and try again." };
  }

  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { id: userId }, include: { professorProfile: true } });
  if (!existing) return { message: "User not found." };

  const emailTaken = await prisma.user.findFirst({ where: { email: data.email, NOT: { id: userId } } });
  if (emailTaken) return { message: "Another account already uses that email." };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      parentName: data.parentName || null,
      parentPhone: data.parentPhone || null,
      timezone: data.timezone,
    },
  });

  if (existing.role === "PROFESSOR") {
    await prisma.professorProfile.upsert({
      where: { userId },
      create: {
        userId,
        headline: data.headline || "",
        bio: data.bio || "",
        subject: data.subject || "",
        hourlyRateCents: Number.isNaN(data.hourlyRateCents) ? 5000 : (data.hourlyRateCents ?? 5000),
        monthlyPriceCents: Number.isNaN(data.monthlyPriceCents) ? null : data.monthlyPriceCents,
      },
      update: {
        headline: data.headline || "",
        bio: data.bio || "",
        subject: data.subject || "",
        hourlyRateCents: Number.isNaN(data.hourlyRateCents) ? 5000 : (data.hourlyRateCents ?? 5000),
        monthlyPriceCents: Number.isNaN(data.monthlyPriceCents) ? null : data.monthlyPriceCents,
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { message: "Saved.", success: true as const };
}
