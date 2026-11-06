"use server";

import * as z from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { sitePath } from "@/lib/site";

export type PaymentsActionState = { message?: string; success?: true } | undefined;

const RecordPaymentSchema = z.object({
  studentId: z.string().min(1, "Please select a student."),
  professorId: z.string().min(1, "Please select a professor."),
  paymentType: z.enum(["monthly", "yearly"]).default("monthly"),
  forMonth: z.coerce.number().int().min(1).max(12),
  forYear: z.coerce.number().int().min(2020).max(2100),
  amountCents: z.coerce.number().int().positive("Amount must be greater than zero."),
  currency: z.string().trim().min(1).default("inr"),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a payment date."),
  monthlyClassQuota: z.coerce.number().int().min(1).max(60).optional(),
  notes: z.string().trim().optional(),
});

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The 12 consecutive {year, month} periods starting at (forYear, forMonth), wrapping across a year boundary as needed. */
function yearOfPeriods(forYear: number, forMonth: number): { year: number; month: number }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const absoluteMonth = forMonth - 1 + i;
    return { year: forYear + Math.floor(absoluteMonth / 12), month: (absoluteMonth % 12) + 1 };
  });
}

/**
 * Admin/superadmin, Cooachly only: records a package payment for a
 * student+professor pairing, covering either the one chosen month or, for a
 * yearly package, the 12 consecutive months starting at the chosen month —
 * each gets its own MonthlyPayment row (an even share of the total amount),
 * so the existing month-by-month slot-access check, quota tracking, and
 * cash-basis P&L (which all key off MonthlyPayment) need no special case for
 * "yearly" at all: the whole year's revenue is still recognized in the
 * month the money actually came in, since every row shares the same
 * `paidAt`. Upserts the StudentEnrollment row first (creating it with the
 * given quota, or updating the quota if one was provided) so a payment
 * always has an enrollment to sit under; recording the same month twice
 * just corrects the earlier entry instead of creating a duplicate.
 */
export async function recordMonthlyPayment(_state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  if (session.site !== "COOACHLY") return { message: "Payments aren't used on this site." };

  const parsed = RecordPaymentSchema.safeParse({
    studentId: formData.get("studentId"),
    professorId: formData.get("professorId"),
    paymentType: formData.get("paymentType") || undefined,
    forMonth: formData.get("forMonth"),
    forYear: formData.get("forYear"),
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "inr",
    paidAt: formData.get("paidAt"),
    monthlyClassQuota: formData.get("monthlyClassQuota") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the payment details." };

  const { studentId, professorId, paymentType, forMonth, forYear, amountCents, currency, paidAt, monthlyClassQuota, notes } = parsed.data;

  const [student, professor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId, role: "STUDENT", site: session.site } }),
    prisma.user.findUnique({ where: { id: professorId, role: "PROFESSOR", site: session.site } }),
  ]);
  if (!student) return { message: "Selected student not found." };
  if (!professor) return { message: "Selected professor not found." };

  const periods = paymentType === "yearly" ? yearOfPeriods(forYear, forMonth) : [{ year: forYear, month: forMonth }];
  // Split evenly across every covered month, cents-accurate — any leftover
  // cent from the division goes to the first month so nothing is lost.
  const baseShare = Math.floor(amountCents / periods.length);
  const remainder = amountCents - baseShare * periods.length;
  const paidAtDate = new Date(`${paidAt}T00:00:00.000Z`);
  const rangeLabel =
    paymentType === "yearly"
      ? `${MONTH_NAMES[periods[0].month - 1]} ${periods[0].year} – ${MONTH_NAMES[periods[11].month - 1]} ${periods[11].year}`
      : `${MONTH_NAMES[forMonth - 1]} ${forYear}`;
  const yearlyNote = paymentType === "yearly" ? `Yearly package covering ${rangeLabel}.` : null;
  const combinedNotes = [yearlyNote, notes || null].filter(Boolean).join(" ") || null;

  await prisma.$transaction([
    prisma.studentEnrollment.upsert({
      where: { studentId_professorId: { studentId, professorId } },
      create: { studentId, professorId, monthlyClassQuota: monthlyClassQuota ?? 8 },
      update: monthlyClassQuota ? { monthlyClassQuota } : {},
    }),
    ...periods.map((period, i) =>
      prisma.monthlyPayment.upsert({
        where: { studentId_professorId_periodYear_periodMonth: { studentId, professorId, periodYear: period.year, periodMonth: period.month } },
        create: {
          studentId,
          professorId,
          periodYear: period.year,
          periodMonth: period.month,
          amountCents: baseShare + (i === 0 ? remainder : 0),
          currency: currency.toLowerCase(),
          paidAt: paidAtDate,
          notes: combinedNotes,
          recordedById: session.userId,
        },
        update: {
          amountCents: baseShare + (i === 0 ? remainder : 0),
          currency: currency.toLowerCase(),
          paidAt: paidAtDate,
          notes: combinedNotes,
          recordedById: session.userId,
        },
      })
    ),
  ]);

  await logAudit({
    site: session.site,
    action: "MONTHLY_PAYMENT_RECORDED",
    actorId: session.userId,
    targetType: "User",
    targetId: studentId,
    detail: `${student.name} paid ${professor.name} for ${rangeLabel}: ${amountCents / 100} ${currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(session.site, "/admin/payments"));
  return { message: `Recorded ${student.name}'s payment to ${professor.name} for ${rangeLabel}.`, success: true };
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

const EditPaymentSchema = z.object({
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  amountCents: z.coerce.number().int().positive("Amount must be greater than zero."),
  currency: z.string().trim().min(1).default("inr"),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Please pick a payment date."),
  notes: z.string().trim().optional(),
});

/**
 * Superadmin-only: corrects an existing payment row in place (wrong
 * amount, date, or month typo'd in at recording time) rather than
 * re-recording it. Doesn't let the student/professor pairing itself
 * change — that identity is what the enrollment and quota logic key off,
 * so correcting a mis-assigned payment is a delete + a fresh record instead.
 */
export async function updateMonthlyPayment(paymentId: string, _state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("SUPERADMIN");

  const existing = await prisma.monthlyPayment.findUnique({
    where: { id: paymentId },
    include: { student: true, professor: true },
  });
  if (!existing) return { message: "Payment not found." };

  const parsed = EditPaymentSchema.safeParse({
    periodYear: formData.get("periodYear"),
    periodMonth: formData.get("periodMonth"),
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "inr",
    paidAt: formData.get("paidAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the payment details." };

  const { periodYear, periodMonth, amountCents, currency, paidAt, notes } = parsed.data;

  try {
    await prisma.monthlyPayment.update({
      where: { id: paymentId },
      data: {
        periodYear,
        periodMonth,
        amountCents,
        currency: currency.toLowerCase(),
        paidAt: new Date(`${paidAt}T00:00:00.000Z`),
        notes: notes || null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { message: `${existing.student.name} already has a payment to ${existing.professor.name} recorded for that month.` };
    }
    throw err;
  }

  await logAudit({
    site: existing.student.site,
    action: "MONTHLY_PAYMENT_UPDATED",
    actorId: session.userId,
    targetType: "User",
    targetId: existing.studentId,
    detail: `Edited ${existing.student.name}'s payment to ${existing.professor.name} for ${periodMonth}/${periodYear}: ${amountCents / 100} ${currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(existing.student.site, "/admin/payments"));
  return { message: "Payment updated.", success: true };
}

/** Superadmin-only: permanently removes a payment row (e.g. recorded against the wrong student/professor entirely). */
export async function deleteMonthlyPayment(paymentId: string): Promise<{ message: string }> {
  const session = await requireRole("SUPERADMIN");

  const existing = await prisma.monthlyPayment.findUnique({
    where: { id: paymentId },
    include: { student: true, professor: true },
  });
  if (!existing) return { message: "Payment not found." };

  await prisma.monthlyPayment.delete({ where: { id: paymentId } });

  await logAudit({
    site: existing.student.site,
    action: "MONTHLY_PAYMENT_DELETED",
    actorId: session.userId,
    targetType: "User",
    targetId: existing.studentId,
    detail: `Deleted ${existing.student.name}'s payment to ${existing.professor.name} for ${existing.periodMonth}/${existing.periodYear}: ${existing.amountCents / 100} ${existing.currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(existing.student.site, "/admin/payments"));
  return { message: "Payment deleted." };
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

/** Superadmin-only: corrects an existing payout row in place. */
export async function updateProfessorPayout(payoutId: string, _state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("SUPERADMIN");

  const existing = await prisma.professorPayout.findUnique({ where: { id: payoutId }, include: { professor: true } });
  if (!existing) return { message: "Payout not found." };

  const parsed = PayoutSchema.omit({ professorId: true }).safeParse({
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "inr",
    paidAt: formData.get("paidAt"),
    periodYear: formData.get("periodYear"),
    periodMonth: formData.get("periodMonth"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the payout details." };

  const { amountCents, currency, paidAt, periodYear, periodMonth, notes } = parsed.data;

  await prisma.professorPayout.update({
    where: { id: payoutId },
    data: {
      periodYear,
      periodMonth,
      amountCents,
      currency: currency.toLowerCase(),
      paidAt: new Date(`${paidAt}T00:00:00.000Z`),
      notes: notes || null,
    },
  });

  await logAudit({
    site: existing.professor.site,
    action: "PROFESSOR_PAYOUT_UPDATED",
    actorId: session.userId,
    targetType: "User",
    targetId: existing.professorId,
    detail: `Edited payout to ${existing.professor.name} for ${periodMonth}/${periodYear}: ${amountCents / 100} ${currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(existing.professor.site, "/admin/payouts"));
  return { message: "Payout updated.", success: true };
}

/** Superadmin-only: permanently removes a payout row. */
export async function deleteProfessorPayout(payoutId: string): Promise<{ message: string }> {
  const session = await requireRole("SUPERADMIN");

  const existing = await prisma.professorPayout.findUnique({ where: { id: payoutId }, include: { professor: true } });
  if (!existing) return { message: "Payout not found." };

  await prisma.professorPayout.delete({ where: { id: payoutId } });

  await logAudit({
    site: existing.professor.site,
    action: "PROFESSOR_PAYOUT_DELETED",
    actorId: session.userId,
    targetType: "User",
    targetId: existing.professorId,
    detail: `Deleted payout to ${existing.professor.name} for ${existing.periodMonth}/${existing.periodYear}: ${existing.amountCents / 100} ${existing.currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(existing.professor.site, "/admin/payouts"));
  return { message: "Payout deleted." };
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

/** Superadmin-only: corrects an existing logged charge in place. */
export async function updateSubscriptionExpense(expenseId: string, _state: PaymentsActionState, formData: FormData): Promise<PaymentsActionState> {
  const session = await requireRole("SUPERADMIN");

  const existing = await prisma.subscriptionExpense.findUnique({ where: { id: expenseId } });
  if (!existing) return { message: "Charge not found." };

  const parsed = ExpenseSchema.safeParse({
    serviceName: formData.get("serviceName"),
    amountCents: Math.round(Number(formData.get("amount") || 0) * 100),
    currency: formData.get("currency") || "usd",
    billedAt: formData.get("billedAt"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the charge details." };

  const { serviceName, amountCents, currency, billedAt, notes } = parsed.data;

  await prisma.subscriptionExpense.update({
    where: { id: expenseId },
    data: {
      serviceName,
      amountCents,
      currency: currency.toLowerCase(),
      billedAt: new Date(`${billedAt}T00:00:00.000Z`),
      notes: notes || null,
    },
  });

  await logAudit({
    site: session.site,
    action: "SUBSCRIPTION_EXPENSE_UPDATED",
    actorId: session.userId,
    detail: `Edited ${serviceName} charge: ${amountCents / 100} ${currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(session.site, "/admin/expenses"));
  return { message: "Charge updated.", success: true };
}

/** Superadmin-only: permanently removes a logged charge. */
export async function deleteSubscriptionExpense(expenseId: string): Promise<{ message: string }> {
  const session = await requireRole("SUPERADMIN");

  const existing = await prisma.subscriptionExpense.findUnique({ where: { id: expenseId } });
  if (!existing) return { message: "Charge not found." };

  await prisma.subscriptionExpense.delete({ where: { id: expenseId } });

  await logAudit({
    site: session.site,
    action: "SUBSCRIPTION_EXPENSE_DELETED",
    actorId: session.userId,
    detail: `Deleted ${existing.serviceName} charge: ${existing.amountCents / 100} ${existing.currency.toUpperCase()}`,
  });

  revalidatePath(sitePath(session.site, "/admin/expenses"));
  return { message: "Charge deleted." };
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
