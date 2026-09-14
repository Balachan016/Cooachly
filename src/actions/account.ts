"use server";

import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { SimpleFormState } from "@/actions/auth";

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

export async function changePassword(_state: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const session = await requireSession();

  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return { message: "User not found." };

  const currentMatches = await verifyPassword(validated.data.currentPassword, user.passwordHash);
  if (!currentMatches) {
    return { message: "Current password is incorrect." };
  }

  const passwordHash = await hashPassword(validated.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  return { message: "Password updated.", success: true };
}
