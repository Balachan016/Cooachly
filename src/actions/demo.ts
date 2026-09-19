"use server";

import * as z from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { getDemoSlotsForSubject, groupDemoSlotsByLocalDay } from "@/lib/scheduling";
import { provisionVideoRoomForBooking } from "@/lib/daily";
import { sendEmail, isEmailConfigured } from "@/lib/notifications/email";
import { sendWhatsApp } from "@/lib/notifications/sms";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function fetchDemoSlots(subject: string, timezone: string) {
  if (!subject) return [];
  const slots = await getDemoSlotsForSubject(subject);
  return groupDemoSlotsByLocalDay(slots, timezone);
}

export type DemoBookingState = { message?: string; success?: true } | undefined;

const DemoBookingSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().optional(),
  timezone: z.string().min(1),
  subject: z.string().trim().min(1, "Please choose a subject."),
  startAt: z.string().min(1, "Please choose a time slot."),
  professorId: z.string().min(1),
});

export async function submitDemoBooking(_state: DemoBookingState, formData: FormData): Promise<DemoBookingState> {
  const parsed = DemoBookingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    timezone: formData.get("timezone"),
    subject: formData.get("subject"),
    startAt: formData.get("startAt"),
    professorId: formData.get("professorId"),
  });

  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message ?? "Please check the form fields." };
  }

  const { name, email, phone, timezone, subject, startAt, professorId } = parsed.data;
  const startDate = new Date(startAt);
  if (Number.isNaN(startDate.getTime())) return { message: "Invalid time selected." };

  // Re-check the slot is still free against the live availability, not just what the browser was showing.
  const freshSlots = await getDemoSlotsForSubject(subject);
  const match = freshSlots.find(
    (s) => s.professorId === professorId && s.startAt.getTime() === startDate.getTime()
  );
  if (!match) return { message: "That slot is no longer available. Please pick another." };

  let student = await prisma.user.findUnique({ where: { email } });
  let isNewAccount = false;

  if (!student) {
    isNewAccount = true;
    const randomPassword = crypto.randomBytes(24).toString("hex");
    student = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        passwordHash: await hashPassword(randomPassword),
        role: "STUDENT",
        timezone,
      },
    });
  }

  const booking = await prisma.booking.create({
    data: {
      studentId: student.id,
      professorId,
      startAt: match.startAt,
      endAt: match.endAt,
      status: "CONFIRMED",
      paymentStatus: "PAID",
      isDemo: true,
      priceCents: 0,
    },
    include: { professor: true },
  });

  await provisionVideoRoomForBooking(booking);

  const when = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(
    match.startAt
  );

  let resetLine = "";
  if (isNewAccount) {
    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: student.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const setPasswordUrl = `${appUrl}/reset-password/${rawToken}`;
    resetLine = `<p>We've created a Cooachly account for you with this email. <a href="${setPasswordUrl}">Set a password</a> to log in and manage your bookings anytime (link expires in 1 hour).</p>`;
  }

  const textBody = `Your free demo session with ${booking.professor.name} is confirmed for ${when}.`;

  if (isEmailConfigured) {
    await sendEmail({
      to: email,
      subject: "Your free Cooachly demo is confirmed",
      html: `
        <p>Hi ${name},</p>
        <p>Your free 30-minute demo session with <strong>${booking.professor.name}</strong> is confirmed for <strong>${when}</strong>.</p>
        ${booking.meetingLink ? `<p><a href="${booking.meetingLink}">Join your demo session</a></p>` : ""}
        ${resetLine}
        <p>— Cooachly</p>
      `,
    });
  }
  if (phone) {
    await sendWhatsApp({ to: phone, body: textBody });
  }

  return { message: "Your free demo session is booked! Check your email for details.", success: true };
}
