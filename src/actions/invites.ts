"use server";

import * as z from "zod";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { sendEmail } from "@/lib/notifications/email";
import { logAudit } from "@/lib/audit";
import type { Site } from "@prisma/client";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type InviteFormState = { message?: string; success?: true } | undefined;

const SendInviteSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name."),
  email: z.string().trim().email("Please enter a valid email."),
  role: z.enum(["STUDENT", "PROFESSOR"]),
  phone: z.string().trim().optional(),
  message: z.string().trim().max(1000).optional(),
});

export async function sendAccountInvite(_state: InviteFormState, formData: FormData): Promise<InviteFormState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const parsed = SendInviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    phone: formData.get("phone") || undefined,
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const { name, email, role, phone, message } = parsed.data;

  // Invites always stay on the sender's own site — admin accounts are
  // created directly by a superadmin (see createAdminAccount) rather than
  // through this invite-and-redeem flow, so there's no ADMIN branch here.
  const site: Site = session.site;

  const existing = await prisma.user.findUnique({ where: { site_email: { site, email } } });
  if (existing) {
    return { message: "This email already has an account on this platform." };
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.accountInviteToken.create({
    data: {
      site,
      name,
      email,
      role,
      phone: phone || null,
      message: message || null,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
    },
  });

  await logAudit({
    site,
    action: "ACCOUNT_INVITE_SENT",
    actorId: session.userId,
    targetType: "AccountInviteToken",
    detail: `${email} invited as ${role}`,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${appUrl}${sitePath(site, `/register/${rawToken}`)}`;
  const brandName = SITE_CONFIG[site].brandName;

  const result = await sendEmail({
    to: email,
    subject: `Welcome to ${brandName} — create your login`,
    html: `
      <p>Hi ${name},</p>
      ${message ? `<p style="white-space:pre-wrap">${message}</p>` : ""}
      <p>You've been invited to create your ${brandName} account. Click below to set your password and get started:</p>
      <p><a href="${inviteUrl}">Create your login</a></p>
      <p>This link expires in 7 days.</p>
      <p>— ${brandName}</p>
    `,
  });

  revalidatePath(sitePath(site, "/admin/users"));

  if (result.skipped) {
    return { message: `Email isn't configured — share this link with them directly: ${inviteUrl}`, success: true };
  }
  if (result.error) {
    return { message: `Invite created, but the email failed to send: ${result.error}. Link: ${inviteUrl}`, success: true };
  }
  return { message: `Invite sent to ${email}.`, success: true };
}

export async function getInvitePreview(token: string) {
  const invite = await prisma.accountInviteToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;
  return { name: invite.name, email: invite.email, role: invite.role };
}

export type RedeemInviteState = { message?: string } | undefined;

const RedeemInviteSchema = z
  .object({
    phone: z.string().trim().optional(),
    timezone: z.string().min(1, "Please select your timezone."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function redeemAccountInvite(
  token: string,
  _state: RedeemInviteState,
  formData: FormData
): Promise<RedeemInviteState> {
  const parsed = RedeemInviteSchema.safeParse({
    phone: formData.get("phone") || undefined,
    timezone: formData.get("timezone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const invite = await prisma.accountInviteToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return { message: "This invite link is invalid or has expired. Please ask us for a new one." };
  }

  const existing = await prisma.user.findUnique({ where: { site_email: { site: invite.site, email: invite.email } } });
  if (existing) {
    return { message: "An account with this email already exists. Try logging in instead." };
  }

  const { phone, timezone, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        site: invite.site,
        name: invite.name,
        email: invite.email,
        phone: phone || invite.phone || null,
        passwordHash,
        role: invite.role,
        timezone,
        professorProfile: invite.role === "PROFESSOR" ? { create: { headline: "", bio: "", subject: "" } } : undefined,
      },
    });
    await tx.accountInviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    return created;
  });

  await logAudit({
    site: user.site,
    action: "ACCOUNT_INVITE_REDEEMED",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
    detail: `${user.role} account created via invite`,
  });

  await createSession({ userId: user.id, role: user.role, site: user.site, name: user.name, email: user.email });
  redirect(roleHomePath(user.role, user.site));
}
