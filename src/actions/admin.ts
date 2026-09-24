"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { hashPassword } from "@/lib/password";
import { sendEmail } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/sms";
import { isPushConfigured, sendPushToUser } from "@/lib/notifications/push";
import { logNotification } from "@/lib/notifications/log";
import { createDailyRoomForBooking, isDailyConfigured } from "@/lib/daily";
import { sitePath } from "@/lib/site";
import type { SimpleFormState } from "@/actions/auth";
import type { Role } from "@prisma/client";

export async function setUserRole(userId: string, role: Role) {
  const session = await requireRole("ADMIN");
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.site !== session.site) return;
  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath(sitePath(session.site, "/admin/users"));
}

export async function setUserActive(userId: string, isActive: boolean) {
  const session = await requireRole("ADMIN");
  if (session.userId === userId) return;
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.site !== session.site) return;
  await prisma.user.update({ where: { id: userId }, data: { isActive } });
  revalidatePath(sitePath(session.site, "/admin/users"));
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
  const session = await requireRole("ADMIN");

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

  revalidatePath(sitePath(session.site, "/admin/users"));
  revalidatePath(sitePath(session.site, `/admin/users/${userId}`));
  return { message: "Saved.", success: true as const };
}

const AdminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export async function adminResetPassword(
  userId: string,
  _state: SimpleFormState,
  formData: FormData
): Promise<SimpleFormState> {
  const session = await requireRole("ADMIN");

  const parsed = AdminResetPasswordSchema.safeParse({ newPassword: formData.get("newPassword") });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.site !== session.site) return { message: "User not found." };

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

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

  const pushResult = await sendPushToUser(admin.id, {
    title: "Cooachly test notification",
    body: "Push notifications are working on this device.",
    url: sitePath(admin.site, "/admin"),
  });
  if (!pushResult.skipped) {
    await logNotification({ userId: admin.id, channel: "PUSH", kind: "test", result: pushResult });
  }
  const pushStatus = !isPushConfigured
    ? "not configured"
    : pushResult.skipped
      ? "skipped — enable notifications under Settings on your phone first"
      : pushResult.error
        ? `failed — ${pushResult.error}`
        : "sent";

  const videoStatus = isDailyConfigured
    ? joinLink
      ? "video link included"
      : "video room creation failed"
    : "Daily.co not configured, no link generated";

  return { message: `Email: ${emailStatus}. WhatsApp: ${whatsappStatus}. Push: ${pushStatus}. Video: ${videoStatus}.` };
}
