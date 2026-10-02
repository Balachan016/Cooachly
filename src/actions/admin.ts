"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { hashPassword, generateTempPassword } from "@/lib/password";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/sms";
import { logNotification } from "@/lib/notifications/log";
import { logAudit } from "@/lib/audit";
import { createDailyRoomForBooking, isDailyConfigured } from "@/lib/daily";
import { sitePath, SITE_CONFIG, DEFAULT_SITE } from "@/lib/site";
import { getAppUrl } from "@/lib/url";
import type { SimpleFormState } from "@/actions/auth";
import type { Role, Site } from "@prisma/client";

// A plain ADMIN may manage students/professors, but only a SUPERADMIN may
// touch another ADMIN (or SUPERADMIN) account — promote to admin, disable,
// reset password, or edit their profile. This is the "superadmin controls
// admin logins" boundary.
const ELEVATED_ROLES: Role[] = ["ADMIN", "SUPERADMIN"];

export async function setUserRole(userId: string, role: Role) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (role === "SUPERADMIN") return; // superadmin accounts are never created via this dropdown

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.site !== session.site) return;
  const touchesElevatedAccount = ELEVATED_ROLES.includes(target.role) || role === "ADMIN";
  if (touchesElevatedAccount && session.role !== "SUPERADMIN") return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await logAudit({
    site: session.site,
    action: "USER_ROLE_CHANGED",
    actorId: session.userId,
    targetType: "User",
    targetId: userId,
    detail: `${target.role} → ${role}`,
  });
  revalidatePath(sitePath(session.site, "/admin/users"));
}

export async function setUserActive(userId: string, isActive: boolean) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (session.userId === userId) return;

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.site !== session.site) return;
  if (ELEVATED_ROLES.includes(target.role) && session.role !== "SUPERADMIN") return;

  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  await logAudit({
    site: session.site,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    actorId: session.userId,
    targetType: "User",
    targetId: userId,
    detail: `${target.name} (${target.email})`,
  });
  revalidatePath(sitePath(session.site, "/admin/users"));
}

export type DeleteUserState = { message?: string; success?: true } | undefined;

/**
 * Permanently deletes a STUDENT or PROFESSOR account. Superadmin-only and
 * deliberately narrower than setUserActive (which an ADMIN can also use) —
 * this is irreversible and, per the schema's cascade rules, also deletes
 * every booking, message, review, and subscription the account is party to
 * (including the other side of any conversation/review with someone else).
 * Deactivating an account is almost always the better first move; this is
 * for when the data genuinely needs to be gone (e.g. a fraudulent signup,
 * or a deletion request).
 */
export async function deleteUserAccount(userId: string): Promise<DeleteUserState> {
  const session = await requireRole("SUPERADMIN");

  // A superadmin oversees both sites, so this isn't confined to session.site.
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { message: "User not found." };
  if (target.role !== "STUDENT" && target.role !== "PROFESSOR") {
    return { message: "Only student or professor accounts can be deleted this way." };
  }

  await prisma.user.delete({ where: { id: userId } });

  await logAudit({
    site: target.site,
    action: "USER_DELETED",
    actorId: session.userId,
    targetType: "User",
    targetId: userId,
    detail: `${target.role} ${target.name} (${target.email})`,
  });

  revalidatePath(sitePath(target.site, "/admin/users"));
  return { message: "Account deleted.", success: true };
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
  const session = await requireRole("ADMIN", "SUPERADMIN");

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
  if (!existing || existing.site !== session.site) return { message: "User not found." };
  if (ELEVATED_ROLES.includes(existing.role) && session.role !== "SUPERADMIN") {
    return { message: "Only a superadmin can edit an admin account." };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { site: existing.site, email: data.email, NOT: { id: userId } },
  });
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

  await logAudit({
    site: session.site,
    action: "USER_PROFILE_UPDATED",
    actorId: session.userId,
    targetType: "User",
    targetId: userId,
    detail: `${data.name} (${data.email})`,
  });

  revalidatePath(sitePath(session.site, "/admin/users"));
  revalidatePath(sitePath(session.site, `/admin/users/${userId}`));
  return { message: "Saved.", success: true as const };
}

const CreateAdminAccountSchema = z.object({
  name: z.string().trim().min(2, "Please enter a name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  site: z.enum(["COOACHLY", "ARTS"]),
});

export type CreateAdminAccountState = { message?: string; success?: true } | undefined;

export async function createAdminAccount(
  _state: CreateAdminAccountState,
  formData: FormData
): Promise<CreateAdminAccountState> {
  const session = await requireRole("SUPERADMIN");

  const parsed = CreateAdminAccountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    site: formData.get("site") || DEFAULT_SITE,
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const { name, email, phone, site } = parsed.data as { name: string; email: string; phone?: string; site: Site };

  const existing = await prisma.user.findUnique({ where: { site_email: { site, email } } });
  if (existing) {
    return { message: "This email already has an account on this platform." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const admin = await prisma.user.create({
    data: { site, name, email, phone: phone || null, passwordHash, role: "ADMIN", timezone: "UTC" },
  });

  await logAudit({
    site,
    action: "ADMIN_ACCOUNT_CREATED",
    actorId: session.userId,
    targetType: "User",
    targetId: admin.id,
    detail: `${admin.name} (${admin.email})`,
  });

  const appUrl = await getAppUrl();
  const loginUrl = `${appUrl}${sitePath(site, "/login")}`;
  const settingsUrl = `${appUrl}${sitePath(site, "/settings")}`;
  const brandName = SITE_CONFIG[site].brandName;

  let emailStatus: "sent" | "skipped" | "failed" = "skipped";
  if (isEmailConfigured) {
    const result = await sendEmail({
      to: email,
      subject: `Your ${brandName} admin login`,
      html: `
        <p>Hi ${name},</p>
        <p>An admin account has been created for you on ${brandName}. Here's how to log in:</p>
        <p><a href="${loginUrl}">${loginUrl}</a></p>
        <p>Email: <strong>${email}</strong><br/>Temporary password: <strong>${tempPassword}</strong></p>
        <p>For security, please <a href="${settingsUrl}">change your password</a> after you log in.</p>
        <p>— ${brandName}</p>
      `,
    });
    emailStatus = result.skipped ? "skipped" : result.error ? "failed" : "sent";
  }

  revalidatePath("/superadmin/admins");

  if (emailStatus === "sent") {
    return { message: `Admin account created and login details emailed to ${email}.`, success: true };
  }
  return {
    message: `Admin account created. Email wasn't sent (${emailStatus === "failed" ? "delivery failed" : "email isn't configured"}) — share these directly: ${loginUrl} · ${email} / ${tempPassword}`,
    success: true,
  };
}

const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export async function adminResetPassword(
  userId: string,
  _state: SimpleFormState,
  formData: FormData
): Promise<SimpleFormState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const parsed = AdminResetPasswordSchema.safeParse({ newPassword: formData.get("newPassword") });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.site !== session.site) return { message: "User not found." };
  if (ELEVATED_ROLES.includes(user.role) && session.role !== "SUPERADMIN") {
    return { message: "Only a superadmin can reset an admin's password." };
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await logAudit({
    site: session.site,
    action: "PASSWORD_RESET_BY_ADMIN",
    actorId: session.userId,
    targetType: "User",
    targetId: userId,
    detail: `${user.name} (${user.email})`,
  });

  return { message: "Password reset.", success: true };
}

export async function sendTestNotification(): Promise<{ message: string }> {
  const session = await requireRole("ADMIN");

  const admin = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!admin) return { message: "Admin account not found." };

  let joinLink: string | null = null;
  if (isDailyConfigured) {
    const startAt = new Date();
    const endAt = new Date(Date.now() + 60 * 60 * 1000);
    const room = await createDailyRoomForBooking({ bookingId: `test-${Date.now()}`, startAt, endAt });
    joinLink = room?.url ?? null;
  }

  const linkLine = joinLink ? `\n\nJoin here: ${joinLink}` : "";
  const textBody = `This is a test notification from Cooachly.${linkLine}`;
  const emailHtml = `
    <p>Hi ${admin.name},</p>
    <p>This is a test notification from Cooachly to confirm your email/WhatsApp/video setup is working.</p>
    ${joinLink ? `<p><a href="${joinLink}">Click here to join a test video call</a></p>` : "<p>(Daily.co isn't configured yet, so no video link was generated.)</p>"}
    <p>— Cooachly</p>
  `;

  const emailResult = await sendEmail({ to: admin.email, subject: "Cooachly test notification", html: emailHtml });
  await logNotification({ userId: admin.id, channel: "EMAIL", kind: "test", result: emailResult });
  const emailStatus = emailResult.skipped ? "not configured" : emailResult.error ? `failed — ${emailResult.error}` : "sent";

  let whatsappStatus: string;
  if (!admin.phone) {
    whatsappStatus = "skipped — no phone number on your account (add one under Settings)";
  } else {
    const waResult = await sendWhatsApp({ to: admin.phone, body: textBody });
    await logNotification({ userId: admin.id, channel: "WHATSAPP", kind: "test", result: waResult });
    whatsappStatus = waResult.skipped ? "not configured" : waResult.error ? `failed — ${waResult.error}` : "sent";
  }

  const videoStatus = isDailyConfigured
    ? joinLink
      ? "video link included"
      : "video room creation failed"
    : "Daily.co not configured, no link generated";

  return { message: `Email: ${emailStatus}. WhatsApp: ${whatsappStatus}. Video: ${videoStatus}.` };
}
