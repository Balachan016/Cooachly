"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { sitePath } from "@/lib/site";

export type PaymentsActionState = { message?: string; success?: true } | undefined;

const RecordPaymentSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  professorId: z.string().min(1, "Please select a professor."),
  amountCents: z.coerce.number().int().positive("Amount must be greater than zero."),
  currency: z.string().trim().min(1).default("inr"),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a payment date."),
  monthlyClassQuota: z.coerce.number().int().min(1).max(60).optional(),
  notes: z.string().trim().optional(),
});

/**
 * Admin/superadmin, Cooachly only: records one calendar month's package
 * payment for a student+professor pairing. Upserts the StudentEnrollment
 * row first (creating it with the given quota, or updating the quota if one
 * was provided) so a payment always has an enrollment to sit under, then
 * upserts the MonthlyPayment itself — recording the same month twice just
 * corrects the earlier entry instead of creating a duplicate.
 */
export async function recordMonthlyPayment(_state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (session.site !== "COOACHLY") return { message: "Payments aren't used on this site." };

  const parsed = RecordPaymentSchema.safeParse({
    studentId: formData.get("studentId"),
    professorId: formData.get("professorId"),
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "inr",
    paidAt: formData.get("paidAt"),
    monthlyClassQuota: formData.get("monthlyClassQuota") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the payment details." };

  const { studentId, professorId, amountCents, currency, paidAt, monthlyClassQuota, notes } = parsed.data;
  // The month the payment is recorded against is just the calendar month of
  // the payment date itself — "I paid on Oct 1" means "this covers October".
  const [periodYear, periodMonthRaw] = paidAt.split("-").map(Number);
  const periodMonth = periodMonthRaw;

  const [student, professor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, role: "STUDENT", site: session.site } }),
    prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR", site: session.site } }),
  ]);
  if (!student) return { message: "Selected student not found." };
  if (!professor) return { message: "Selected professor not found." };

  await prisma.$transaction([
    prisma.studentEnrollment.upsert({
      where: { studentId_professorId: { studentId, professorId } },
      create: { studentId, professorId, monthlyClassQuota: monthlyClassQuota ?? 8 },
      update: monthlyClassQuota ? { monthlyClassQuota } : {},
    }),
    prisma.monthlyPayment.upsert({
      where: { studentId_professorId_periodYear_periodMonth: { studentId, professorId, periodYear, periodMonth } },
      create: {
        studentId,
        professorId,
        periodYear,
        periodMonth,
        amountCents,
        currency: currency.toLowerCase(),
        paidAt: new Date(`${paidAt}T00:00:00.000Z`),
        notes: notes || null,
        recordedById: session.userId,
      },
      update: {
        amountCents,
        currency: currency.toLowerCase(),
        paidAt: new Date(`${paidAt}T00:00:00.000Z`),
        notes: notes || null,
        recordedById: session.userId,
      },
    }),
  ]);

  await logAudit({
    site: session.site,
    action: "MONTHLY_PAYMENT_RECORDED",
    actorId: session.userId,
    targetType: "User",
    targetId: studentId,
    detail: `${student.name} paid ${professor.name} for ${periodMonth}/${periodYear}: ${amountCents / 100} ${currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(session.site, "/admin/payments"));
  return { message: `Recorded ${student.name}'s payment to ${professor.name} for ${periodMonth}/${periodYear}.`, success: true };
}

export async function setSlotViewOverride(studentId: string, professorId: string, override: boolean) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (session.site !== "COOACHLY") return;

  const [student, professor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, role: "STUDENT", site: session.site } }),
    prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR", site: session.site } }),
  ]);
  if (!student || !professor) return;

  await prisma.studentEnrollment.upsert({
    where: { studentId_professorId: { studentId, professorId } },
    create: { studentId, professorId, slotViewOverride: override },
    update: { slotViewOverride: override },
  });

  await logAudit({
    site: session.site,
    action: "SLOT_VIEW_OVERRIDE_CHANGED",
    actorId: session.userId,
    targetType: "User",
    targetId: studentId,
    detail: `${override ? "Enabled" : "Disabled"} slot-view override for ${student.name} with ${professor.name}`,
  });

  revalidatePath(sitePath(session.site, "/admin/payments"));
}

const PayoutSchema = z.object({
  professorId: z.string().min(1, "Please select a professor."),
  amountCents: z.coerce.number().int().positive("Amount must be greater than zero."),
  currency: z.string().trim().min(1).default("inr"),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a payout date."),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  notes: z.string().trim().optional(),
});

export async function recordProfessorPayout(_state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (session.site !== "COOACHLY") return { message: "Payouts aren't used on this site." };

  const parsed = PayoutSchema.safeParse({
    professorId: formData.get("professorId"),
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "inr",
    paidAt: formData.get("paidAt"),
    periodYear: formData.get("periodYear"),
    periodMonth: formData.get("periodMonth"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the payout details." };

  const { professorId, amountCents, currency, paidAt, periodYear, periodMonth, notes } = parsed.data;

  const professor = await prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR", site: session.site } });
  if (!professor) return { message: "Selected professor not found." };

  await prisma.professorPayout.create({
    data: {
      professorId,
      periodYear,
      periodMonth,
      amountCents,
      currency: currency.toLowerCase(),
      paidAt: new Date(`${paidAt}T00:00:00.000Z`),
      notes: notes || null,
      recordedById: session.userId,
    },
  });

  await logAudit({
    site: session.site,
    action: "PROFESSOR_PAYOUT_RECORDED",
    actorId: session.userId,
    targetType: "User",
    targetId: professorId,
    detail: `Paid ${professor.name} ${amountCents / 100} ${currency.toUpperCase()} for ${periodMonth}/${periodYear}`,
  });

  revalidatePath(sitePath(session.site, "/admin/payouts"));
  return { message: `Recorded payout to ${professor.name} for ${periodMonth}/${periodYear}.`, success: true };
}

const ExpenseSchema = z.object({
  serviceName: z.string().trim().min(1, "Please name the service."),
  amountCents: z.coerce.number().int().positive("Amount must be greater than zero."),
  currency: z.string().trim().min(1).default("usd"),
  billedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a billing date."),
  notes: z.string().trim().optional(),
});

export async function logSubscriptionExpense(_state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (session.site !== "COOACHLY") return { message: "Subscription spend tracking isn't used on this site." };

  const parsed = ExpenseSchema.safeParse({
    serviceName: formData.get("serviceName"),
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "usd",
    billedAt: formData.get("billedAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the charge details." };

  const { serviceName, amountCents, currency, billedAt, notes } = parsed.data;

  await prisma.subscriptionExpense.create({
    data: {
      serviceName,
      amountCents,
      currency: currency.toLowerCase(),
      billedAt: new Date(`${billedAt}T00:00:00.000Z`),
      notes: notes || null,
      recordedById: session.userId,
    },
  });

  await logAudit({
    site: session.site,
    action: "SUBSCRIPTION_EXPENSE_LOGGED",
    actorId: session.userId,
    detail: `Logged ${serviceName}: ${amountCents / 100} ${currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(session.site, "/admin/expenses"));
  return { message: `Logged ${serviceName} charge.`, success: true };
}

const ExchangeRateSchema = z.object({
  fromCurrency: z.string().trim().min(1),
  toCurrency: z.string().trim().min(1),
  rate: z.coerce.number().positive("Rate must be greater than zero."),
});

export async function updateExchangeRate(_state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("SUPERADMIN");

  const parsed = ExchangeRateSchema.safeParse({
    fromCurrency: formData.get("fromCurrency"),
    toCurrency: formData.get("toCurrency"),
    rate: formData.get("rate"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the exchange rate." };

  const fromCurrency = parsed.data.fromCurrency.toLowerCase();
  const toCurrency = parsed.data.toCurrency.toLowerCase();

  await prisma.exchangeRate.upsert({
    where: { fromCurrency_toCurrency: { fromCurrency, toCurrency } },
    create: { fromCurrency, toCurrency, rate: parsed.data.rate, updatedById: session.userId },
    update: { rate: parsed.data.rate, updatedById: session.userId },
  });

  await logAudit({
    site: session.site,
    action: "EXCHANGE_RATE_UPDATED",
    actorId: session.userId,
    detail: `${fromCurrency.toUpperCase()} → ${toCurrency.toUpperCase()} set to ${parsed.data.rate}`,
  });

  revalidatePath("/superadmin/settings");
  revalidatePath(sitePath(session.site, "/admin/pnl"));
  revalidatePath(sitePath(session.site, "/admin/expenses"));
  return { message: `Updated ${fromCurrency.toUpperCase()} → ${toCurrency.toUpperCase()} to ${parsed.data.rate}.`, success: true };
}
