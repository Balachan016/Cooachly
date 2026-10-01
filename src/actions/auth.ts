"use server";

import * as z from "zod";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, deleteSession, getSessionCookie, decrypt } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { sitePath, DEFAULT_SITE, SITE_CONFIG } from "@/lib/site";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { getAppUrl } from "@/lib/url";
import { logAudit } from "@/lib/audit";
import type { Site } from "@prisma/client";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Every auth form carries a hidden `site` field so a single shared action
// knows which platform (Cooachly or Arts) it's authenticating against;
// an absent/invalid value falls back to Cooachly rather than failing.
function readSite(formData: FormData): Site {
  return formData.get("site") === "ARTS" ? "ARTS" : DEFAULT_SITE;
}

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
  const site = readSite(formData);

  const user = await prisma.user.findUnique({ where: { site_email: { site, email } } });
  if (!user || !user.isActive) {
    return { message: "Invalid email or password." };
  }

  const passwordsMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordsMatch) {
    return { message: "Invalid email or password." };
  }

  await createSession({ userId: user.id, role: user.role, site: user.site, name: user.name, email: user.email });
  await logAudit({
    site: user.site,
    action: "LOGIN",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
    detail: `${user.role} login`,
  });
  redirect(roleHomePath(user.role, user.site));
}

export async function logout() {
  const session = await decrypt(await getSessionCookie());
  const site = session?.site ?? DEFAULT_SITE;
  if (session) {
    await logAudit({
      site: session.site,
      action: "LOGOUT",
      actorId: session.userId,
      targetType: "User",
      targetId: session.userId,
      detail: `${session.role} logout`,
    });
  }
  await deleteSession();
  redirect(sitePath(site, "/login"));
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

  const site = readSite(formData);
  const user = await prisma.user.findUnique({ where: { site_email: { site, email: validated.data.email } } });

  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl = await getAppUrl();
    const resetUrl = `${appUrl}${sitePath(site, `/reset-password/${rawToken}`)}`;
    const brandName = SITE_CONFIG[site].brandName;

    if (isEmailConfigured) {
      await sendEmail({
        to: user.email,
        subject: `Reset your ${brandName} password`,
        html: `
          <p>Hi ${user.name},</p>
          <p>We received a request to reset your ${brandName} password. This link expires in 1 hour.</p>
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
