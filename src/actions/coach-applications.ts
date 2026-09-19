"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { CURRICULUM_OPTIONS } from "@/lib/curricula";
import type { CoachApplicationStatus } from "@prisma/client";

export type CoachApplicationFormState = { message?: string; success?: true } | undefined;

const CoachApplicationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(2, "Please enter the subject(s) you teach."),
  curricula: z.array(z.enum(CURRICULUM_OPTIONS)).default([]),
  yearsExperience: z.union([z.coerce.number().int().min(0).max(80), z.nan()]).optional(),
  qualifications: z.string().trim().min(10, "Please share a bit about your background and qualifications."),
  availability: z.string().trim().optional(),
  message: z.string().trim().optional(),
});

export async function submitCoachApplication(
  _state: CoachApplicationFormState,
  formData: FormData
): Promise<CoachApplicationFormState> {
  const rawYears = formData.get("yearsExperience");
  const parsed = CoachApplicationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject"),
    curricula: formData.getAll("curricula"),
    yearsExperience: rawYears ? rawYears : NaN,
    qualifications: formData.get("qualifications"),
    availability: formData.get("availability") || undefined,
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const { yearsExperience, ...rest } = parsed.data;

  const application = await prisma.coachApplication.create({
    data: { ...rest, yearsExperience: Number.isNaN(yearsExperience) ? null : yearsExperience },
  });

  if (isEmailConfigured) {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN", isActive: true }, select: { email: true } });
    if (admins.length > 0) {
      await Promise.all(
        admins.map((admin) =>
          sendEmail({
            to: admin.email,
            subject: "New Cooachly coach application",
            html: `
              <p>New coach application from <strong>${application.name}</strong> (${application.email}${application.phone ? `, ${application.phone}` : ""}):</p>
              <p>Subject: ${application.subject}${application.curricula.length ? ` · Curricula: ${application.curricula.join(", ")}` : ""}</p>
              <p style="white-space:pre-wrap">${application.qualifications}</p>
            `,
          })
        )
      );
    }
  }

  return {
    message:
      "Thanks for applying! Our team will review your application and reach out within a few days to schedule a short interview and demo session. If approved, we'll walk you through onboarding, including how payments are set up.",
    success: true,
  };
}

export async function updateCoachApplicationStatus(id: string, status: CoachApplicationStatus) {
  await requireRole("ADMIN");
  await prisma.coachApplication.update({ where: { id }, data: { status } });
  revalidatePath("/admin/coach-applications");
}
