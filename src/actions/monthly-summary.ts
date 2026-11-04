"use server";

import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { summarizeMonth, isAiSummaryConfigured } from "@/lib/ai-summary";
import { sitePath } from "@/lib/site";

export type SummaryPeriod = { startMonth: string; endMonth: string; timezone: string };

/** [start, end) instants covering startMonth through endMonth inclusive ("YYYY-MM" strings), as that span reads in the given timezone — not UTC, so a month boundary lands on the right calendar day for whoever's reading it. */
function monthRangeInTimezone(period: SummaryPeriod): { periodStart: Date; periodEnd: Date } {
  const startMatch = /^(\d{4})-(\d{2})$/.exec(period.startMonth);
  const endMatch = /^(\d{4})-(\d{2})$/.exec(period.endMonth);
  if (!startMatch || !endMatch) throw new Error("Invalid month format.");
  const [, startY, startM] = startMatch.map(Number) as unknown as [never, number, number];
  const [, endY, endM] = endMatch.map(Number) as unknown as [never, number, number];

  const periodStart = fromZonedTime(`${startY}-${String(startM).padStart(2, "0")}-01T00:00:00`, period.timezone);
  // Exclusive upper bound: the first instant of the month right after endMonth.
  const afterEndY = endM === 12 ? endY + 1 : endY;
  const afterEndM = endM === 12 ? 1 : endM + 1;
  const periodEnd = fromZonedTime(`${afterEndY}-${String(afterEndM).padStart(2, "0")}-01T00:00:00`, period.timezone);
  return { periodStart, periodEnd };
}

/**
 * Generates a progress recap per (student, professor, subject) from each
 * completed session's own summary within a date range — defaulting to last
 * calendar month, but the admin can widen it to any custom span (a
 * semester, a year, anything in between) via the Summaries tab's start/end
 * month picker. Safe to re-run — re-generating a period overwrites its
 * existing recap rather than duplicating it.
 */
export async function generateMonthlySummaries(period?: SummaryPeriod): Promise<{ message: string }> {
  const session = await requireRole("ADMIN");

  if (!isAiSummaryConfigured) {
    return { message: "OpenAI isn't configured, so monthly summaries can't be generated yet." };
  }

  let periodStart: Date;
  let periodEnd: Date;
  if (period) {
    try {
      ({ periodStart, periodEnd } = monthRangeInTimezone(period));
    } catch {
      return { message: "Invalid month range or timezone." };
    }
    if (periodEnd <= periodStart) return { message: "The end month must be on or after the start month." };
  } else {
    const now = new Date();
    periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  const bookings = await prisma.booking.findMany({
    where: {
      status: "COMPLETED",
      startAt: { gte: periodStart, lt: periodEnd },
      aiSummary: { not: null },
      professor: { site: session.site },
    },
    include: { student: true, professor: { include: { professorProfile: true } } },
  });

  const groups = new Map<
    string,
    { studentId: string; professorId: string; studentName: string; professorName: string; subject: string; summaries: string[] }
  >();

  for (const booking of bookings) {
    const subject = booking.professor.professorProfile?.subject || "General coaching";
    const key = `${booking.studentId}:${booking.professorId}`;
    const group = groups.get(key) ?? {
      studentId: booking.studentId,
      professorId: booking.professorId,
      studentName: booking.student.name,
      professorName: booking.professor.name,
      subject,
      summaries: [],
    };
    if (booking.aiSummary) group.summaries.push(booking.aiSummary);
    groups.set(key, group);
  }

  let generated = 0;
  for (const group of groups.values()) {
    const summary = await summarizeMonth({
      studentName: group.studentName,
      professorName: group.professorName,
      subject: group.subject,
      sessionSummaries: group.summaries,
    });
    if (!summary) continue;

    await prisma.monthlySummary.upsert({
      where: {
        studentId_professorId_periodStart: {
          studentId: group.studentId,
          professorId: group.professorId,
          periodStart,
        },
      },
      create: {
        studentId: group.studentId,
        professorId: group.professorId,
        subject: group.subject,
        periodStart,
        periodEnd,
        sessionCount: group.summaries.length,
        summary,
      },
      update: {
        subject: group.subject,
        sessionCount: group.summaries.length,
        summary,
      },
    });
    generated += 1;
  }

  revalidatePath(sitePath(session.site, "/admin/class-logs"));

  const periodLabel = period
    ? `${period.startMonth}${period.endMonth !== period.startMonth ? ` through ${period.endMonth}` : ""}`
    : "last month";
  if (groups.size === 0) {
    return { message: `No completed sessions with summaries found for ${periodLabel}.` };
  }
  return { message: `Generated ${generated} of ${groups.size} summaries for ${periodLabel}.` };
}

/**
 * On-demand recap for one student + subject, covering every completed
 * session to date (not just last month) — for "what has this student
 * covered in Chemistry so far". Reuses the same MonthlySummary row(s) the
 * batch job writes, keyed from each session's first month, so re-running
 * this (or the batch job) later just refreshes it instead of duplicating.
 */
export async function generateStudentSubjectSummary(studentId: string, subject: string): Promise<{ message: string }> {
  const session = await requireRole("ADMIN");

  if (!isAiSummaryConfigured) {
    return { message: "OpenAI isn't configured, so summaries can't be generated yet." };
  }
  if (!subject.trim()) return { message: "Pick a subject." };

  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student || student.site !== session.site || student.role !== "STUDENT") {
    return { message: "Student not found." };
  }

  const bookings = await prisma.booking.findMany({
    where: {
      studentId,
      status: "COMPLETED",
      aiSummary: { not: null },
      professor: { site: session.site, professorProfile: { subject: { equals: subject, mode: "insensitive" } } },
    },
    include: { professor: true },
    orderBy: { startAt: "asc" },
  });

  if (bookings.length === 0) {
    return { message: `No completed sessions with a summary found for ${student.name} in ${subject}.` };
  }

  const groups = new Map<string, { professorId: string; professorName: string; summaries: string[]; periodStart: Date }>();
  for (const booking of bookings) {
    const group = groups.get(booking.professorId) ?? {
      professorId: booking.professorId,
      professorName: booking.professor.name,
      summaries: [],
      periodStart: new Date(Date.UTC(booking.startAt.getUTCFullYear(), booking.startAt.getUTCMonth(), 1)),
    };
    if (booking.aiSummary) group.summaries.push(booking.aiSummary);
    groups.set(booking.professorId, group);
  }

  const periodEnd = new Date();
  let generated = 0;
  for (const group of groups.values()) {
    const summary = await summarizeMonth({
      studentName: student.name,
      professorName: group.professorName,
      subject,
      sessionSummaries: group.summaries,
    });
    if (!summary) continue;

    await prisma.monthlySummary.upsert({
      where: { studentId_professorId_periodStart: { studentId, professorId: group.professorId, periodStart: group.periodStart } },
      create: {
        studentId,
        professorId: group.professorId,
        subject,
        periodStart: group.periodStart,
        periodEnd,
        sessionCount: group.summaries.length,
        summary,
      },
      update: { subject, periodEnd, sessionCount: group.summaries.length, summary },
    });
    generated += 1;
  }

  revalidatePath(sitePath(session.site, "/admin/class-logs"));
  if (generated === 0) {
    return { message: `Had ${bookings.length} completed session(s) to summarize, but the AI summary couldn't be generated.` };
  }
  return {
    message: `Generated ${generated} ${generated === 1 ? "summary" : "summaries"} covering ${bookings.length} session${bookings.length === 1 ? "" : "s"} to date for ${student.name} in ${subject}.`,
  };
}
