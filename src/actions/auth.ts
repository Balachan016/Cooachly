"use server";

import * as z from "zod";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const SignupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  role: z.enum(["STUDENT", "PROFESSOR"]),
  timezone: z.string().min(1, "Please select your timezone."),
});

export type AuthFormState =
  | {
      errors?: {
        name?: string[];
        email?: string[];
        phone?: string[];
        password?: string[];
        role?: string[];
        timezone?: string[];
      };
      message?: string;
    }
  | undefined;

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = SignupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    role: formData.get("role"),
    timezone: formData.get("timezone"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, phone, password, role, timezone } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { message: "An account with this email already exists." };
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone: phone || null,
      passwordHash,
      role,
      timezone,
      professorProfile:
        role === "PROFESSOR"
          ? { create: { headline: "", bio: "", subject: "" } }
          : undefined,
    },
  });

  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  redirect(roleHomePath(user.role));
}

const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    return { message: "Invalid email or password." };
  }

  const passwordsMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordsMatch) {
    return { message: "Invalid email or password." };
  }

  await createSession({ userId: user.id, role: user.role, name: user.name, email: user.email });
  redirect(roleHomePath(user.role));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

export type SimpleFormState = { message?: string; success?: true } | undefined;

const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
});

export async function requestPasswordReset(_state: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const validated = ForgotPasswordSchema.safeParse({ email: formData.get("email") });

  // Always show the same generic message so we don't reveal whether an email exists.
  const genericMessage = "If an account exists for that email, we've sent a password reset link.";
  if (!validated.success) {
    return { message: genericMessage };
  }

  const user = await prisma.user.findUnique({ where: { email: validated.data.email } });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password/${rawToken}`;

    if (isEmailConfigured) {
      await sendEmail({
        to: user.email,
        subject: "Reset your Cooachly password",
        html: `
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your Cooachly password. This link expires in 1 hour.</p>
          <p><a href="${resetUrl}">Reset your password</a></p>
          <p>If you didn't request this, you can safely ignore this email.</p>
        `,
      });
    } else {
      console.log(`[password-reset] email not configured; reset link for ${user.email}: ${resetUrl}`);
    }
  }

  return { message: genericMessage };
}

const ResetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function resetPassword(token: string, _state: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const validated = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { message: "This reset link is invalid or has expired. Please request a new one." };
  }

  const passwordHash = await hashPassword(validated.data.password);

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);

  return { message: "Your password has been updated. You can now log in.", success: true };
}
