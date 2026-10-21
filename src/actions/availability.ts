"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { resolveAvailabilityPeriod, isAvailabilityPeriodAllowed, type AvailabilityPeriod } from "@/lib/availability-period";

const AvailabilitySchema = z
  .object({
    mode: z.enum(["recurring", "oneTime"]).default("recurring"),
    periodKey: z.enum(["current", "next"]).default("current"),
    dayOfWeek: z.coerce.number().int().min(0).max(6).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string().min(1),
    sessionLengthMinutes: z.coerce.number().int().refine((v) => [30, 45, 60, 75, 90].includes(v), {
      message: "Session length must be 30, 45, 60, 75, or 90 minutes.",
    }),
  })
  .refine((data) => (data.mode === "recurring" ? data.dayOfWeek !== undefined : Boolean(data.date)), {
    message: "Pick a day of week (weekly) or a date (one-time).",
  });

// Cooachly Arts classes are fixed at 30 minutes — enforced here (not just in
// the Arts availability form) so a crafted request can't set another length.
const ARTS_SESSION_LENGTH_MINUTES = 30;

function periodFromDateString(date: string): AvailabilityPeriod {
  const [year, month] = date.split("-").map(Number);
  return { year, month };
}

export async function addAvailability(formData: FormData) {
  const session = await requireRole("PROFESSOR");

  const parsed = AvailabilitySchema.safeParse({
    mode: formData.get("mode") || undefined,
    periodKey: formData.get("periodKey") || undefined,
    dayOfWeek: formData.get("dayOfWeek") || undefined,
    date: formData.get("date") || undefined,
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
    sessionLengthMinutes: formData.get("sessionLengthMinutes"),
  });

  if (!parsed.success) return;
  const { mode, periodKey, dayOfWeek, date, startTime, endTime, timezone } = parsed.data;
  const sessionLengthMinutes = session.site === "ARTS" ? ARTS_SESSION_LENGTH_MINUTES : parsed.data.sessionLengthMinutes;
  if (startTime >= endTime) return;

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { timezone: true } });
  if (!user) return;

  // A recurring window's month comes from which month tab the professor was
  // viewing (periodKey); a one-off window's month is just whatever month its
  // own date falls in. Either way it must be this month or next month — the
  // only months anyone can set availability for.
  const period = mode === "recurring" ? resolveAvailabilityPeriod(periodKey, user.timezone).period : date ? periodFromDateString(date) : null;
  if (!period || !isAvailabilityPeriodAllowed(period, user.timezone)) return;

  await prisma.availability.create({
    data: {
      professorId: session.userId,
      // Stored as plain UTC-midnight calendar dates, compared as date
      // strings in getSlotsWithStatus — never treated as an instant, so this
      // isn't affected by `timezone`.
      dayOfWeek: mode === "recurring" ? (dayOfWeek ?? null) : null,
      date: mode === "oneTime" && date ? new Date(`${date}T00:00:00.000Z`) : null,
      startTime,
      endTime,
      timezone,
      sessionLengthMinutes,
      periodYear: period.year,
      periodMonth: period.month,
    },
  });

  revalidatePath(sitePath(session.site, "/professor/availability"));
}

export async function removeAvailability(availabilityId: string) {
  const session = await requireRole("PROFESSOR");

  await prisma.availability.deleteMany({
    where: { id: availabilityId, professorId: session.userId },
  });

  revalidatePath(sitePath(session.site, "/professor/availability"));
}

/**
 * Duplicates every recurring (dayOfWeek) window from the current month into
 * next month, so renewing an unchanged schedule each month doesn't mean
 * retyping it from scratch. Skips a weekday/time/length combination that's
 * already in next month (so running this twice, or after already adding a
 * few windows by hand, doesn't create duplicates). One-off (date) windows
 * are never copied — a specific day doesn't make sense to shift a month.
 */
export async function copyAvailabilityToNextMonth() {
  const session = await requireRole("PROFESSOR");

  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { timezone: true } });
  if (!user) return;

  const { period: currentPeriod } = resolveAvailabilityPeriod("current", user.timezone);
  const { period: nextPeriod } = resolveAvailabilityPeriod("next", user.timezone);

  const [currentWindows, nextWindows] = await Promise.all([
    prisma.availability.findMany({
      where: { professorId: session.userId, dayOfWeek: { not: null }, periodYear: currentPeriod.year, periodMonth: currentPeriod.month },
    }),
    prisma.availability.findMany({
      where: { professorId: session.userId, dayOfWeek: { not: null }, periodYear: nextPeriod.year, periodMonth: nextPeriod.month },
    }),
  ]);

  const nextKey = (a: { dayOfWeek: number | null; startTime: string; endTime: string; sessionLengthMinutes: number }) =>
    `${a.dayOfWeek}:${a.startTime}:${a.endTime}:${a.sessionLengthMinutes}`;
  const existing = new Set(nextWindows.map(nextKey));
  const toCopy = currentWindows.filter((a) => !existing.has(nextKey(a)));

  if (toCopy.length > 0) {
    await prisma.availability.createMany({
      data: toCopy.map((a) => ({
        professorId: session.userId,
        dayOfWeek: a.dayOfWeek,
        startTime: a.startTime,
        endTime: a.endTime,
        timezone: a.timezone,
        sessionLengthMinutes: a.sessionLengthMinutes,
        isActive: a.isActive,
        periodYear: nextPeriod.year,
        periodMonth: nextPeriod.month,
      })),
    });
  }

  revalidatePath(sitePath(session.site, "/professor/availability"));
}
