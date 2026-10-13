"use server";

import * as z from "zod";
import crypto from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { createSession } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { sitePath, SITE_CONFIG } from "@/lib/site";
import { getAppUrl } from "@/lib/url";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsAppInvite } from "@/lib/notifications/sms";
import { getAdminCcEmails } from "@/lib/notifications/admin-recipients";
import { logAudit } from "@/lib/audit";
import { OptionalPhoneSchema } from "@/lib/phone";
import { nextUserCode } from "@/lib/user-code";
import type { Role, Site } from "@prisma/client";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export type InviteFormState = { message?: string; success?: true } | undefined;

const SendInviteSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name."),
  email: z.string().trim().email("Please enter a valid email."),
  role: z.enum(["STUDENT", "PROFESSOR"]),
  phone: OptionalPhoneSchema,
  message: z.string().trim().max(1000).optional(),
});

type CreateInviteOpts = {
  site: Site;
  name: string;
  email: string;
  role: "STUDENT" | "PROFESSOR";
  phone?: string | null;
  message?: string | null;
  actorId: string;
};

/**
 * Creates the account directly — no invite-and-redeem step. Shared by the
 * admin-facing "invite a user" form and any other place that needs to give
 * someone a login (an approved coach application, a demo that converted)
 * without re-deriving the password/code/email/audit-log plumbing each time.
 * Same pattern as createAdminAccount: a temp password is generated and
 * emailed straight to them, so they can log in immediately instead of
 * waiting on them to click a link and set one up themselves.
 */
export async function createAccountInvite(opts: CreateInviteOpts) {
  const { site, name, email, role, phone, message, actorId } = opts;

  const existing = await prisma.user.findUnique({ where: { site_email: { site, email } } });
  if (existing) {
    return { ok: false as const, message: "This email already has an account on this platform." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.$transaction(async (tx) => {
    const code = await nextUserCode(role, tx);
    return tx.user.create({
      data: {
        site,
        name,
        email,
        phone: phone || null,
        passwordHash,
        role,
        code,
        timezone: "UTC",
        professorProfile: role === "PROFESSOR" ? { create: { headline: "", bio: "", subject: "" } } : undefined,
      },
    });
  });

  await logAudit({
    site,
    action: "ACCOUNT_CREATED_BY_ADMIN",
    actorId,
    targetType: "User",
    targetId: user.id,
    detail: `${name} (${email}) created directly as ${role}`,
  });

  const appUrl = await getAppUrl();
  const loginUrl = `${appUrl}${sitePath(site, "/login")}`;
  const brandName = SITE_CONFIG[site].brandName;
  const adminEmails = getAdminCcEmails();

  const result = await sendEmail({
    to: email,
    cc: adminEmails,
    site,
    subject: `Welcome to ${brandName} — your login is ready`,
    html: `
      <p>Hi ${name},</p>
      ${message ? `<p style="white-space:pre-wrap">${message}</p>` : ""}
      <p>Your ${brandName} account has been created. Here's how to log in:</p>
      <p><a href="${loginUrl}">${loginUrl}</a></p>
      <p>Email: <strong>${email}</strong><br/>Temporary password: <strong>${tempPassword}</strong></p>
      <p>For security, please change your password after you log in (under Settings).</p>
      <p>— ${brandName}</p>
    `,
  });

  if (phone) {
    await sendWhatsAppInvite({
      to: phone,
      body: `Hi ${name}, your ${brandName} account is ready. Log in here: ${loginUrl} — Email: ${email}, Temporary password: ${tempPassword}`,
      variables: { name, brandName, inviteUrl: loginUrl },
    });
  }

  return { ok: true as const, loginUrl, tempPassword, result, userId: user.id };
}

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
  // through this flow, so there's no ADMIN branch here.
  const site: Site = session.site;

  const invite = await createAccountInvite({ site, name, email, role, phone, message, actorId: session.userId });
  if (!invite.ok) return { message: invite.message };

  revalidatePath(sitePath(site, "/admin/users"));

  const { loginUrl, tempPassword, result } = invite;
  if (result.skipped) {
    return {
      message: `Account created. Email isn't configured — share these directly: ${loginUrl} · ${email} / ${tempPassword}`,
      success: true,
    };
  }
  if (result.error) {
    return {
      message: `Account created, but the email failed to send (${result.error}) — share these directly: ${loginUrl} · ${email} / ${tempPassword}`,
      success: true,
    };
  }
  return { message: `Account created and login details emailed to ${email}.`, success: true };
}

export type ProcessPendingInvitesState = { message?: string; success?: true } | undefined;

/**
 * Catch-up for invites sent before direct account creation shipped (see
 * createAccountInvite above) — creates a real account right now for every
 * not-yet-redeemed invite token, regardless of whether its 7-day link
 * already expired, instead of leaving it to the recipient to click. Each
 * processed token is marked used so it can't also be redeemed the old way.
 */
export async function createPendingInviteAccounts(): Promise<ProcessPendingInvitesState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const pending = await prisma.accountInviteToken.findMany({
    where: { usedAt: null, ...(session.role === "SUPERADMIN" ? {} : { site: session.site }) },
    orderBy: { createdAt: "asc" },
  });
  if (pending.length === 0) return { message: "No pending invites to process.", success: true };

  let created = 0;
  let skipped = 0;
  for (const invite of pending) {
    const result = await createAccountInvite({
      site: invite.site,
      name: invite.name,
      email: invite.email,
      role: invite.role === "PROFESSOR" ? "PROFESSOR" : "STUDENT",
      phone: invite.phone,
      message: invite.message,
      actorId: session.userId,
    });
    // Either way this invite is resolved now — mark it used so it stops
    // showing up as pending (an "already has an account" skip just means
    // someone else created or redeemed it in the meantime).
    await prisma.accountInviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } });
    if (result.ok) created++;
    else skipped++;
  }

  revalidatePath(sitePath(session.site, "/admin/users"));
  return {
    message: `Created ${created} account${created === 1 ? "" : "s"}${skipped > 0 ? ` (${skipped} skipped — already had an account)` : ""}.`,
    success: true,
  };
}

/** For the admin Users page to show how many invites are still waiting to be processed. */
export async function getPendingInviteCount(site: Site, role: Role): Promise<number> {
  return prisma.accountInviteToken.count({
    where: { usedAt: null, ...(role === "SUPERADMIN" ? {} : { site }) },
  });
}

export async function getInvitePreview(token: string) {
  const invite = await prisma.accountInviteToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;
  return { name: invite.name, email: invite.email, role: invite.role };
}

export type RedeemInviteState = { message?: string } | undefined;

const RedeemInviteSchema = z
  .object({
    phone: OptionalPhoneSchema,
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
    const code = await nextUserCode(invite.role, tx);
    const created = await tx.user.create({
      data: {
        site: invite.site,
        name: invite.name,
        email: invite.email,
        phone: phone || invite.phone || null,
        passwordHash,
        role: invite.role,
        code,
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
