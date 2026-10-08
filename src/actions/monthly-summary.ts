"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { summarizeMonth, isAiSummaryConfigured } from "@/lib/ai-summary";
import { sitePath } from "@/lib/site";

/**
 * Generates a monthly progress recap per (student, professor, subject) for
 * the most recently completed calendar month, from that month's individual
 * session summaries. Safe to re-run — re-generating a month overwrites its
 * existing recap rather than duplicating it.
 */
export async function generateMonthlySummaries(): Promise<{ message: string }> {
  const session = await requireRole("ADMIN");

  if (!isAiSummaryConfigured) {
    return { message: "OpenAI isn't configured, so monthly summaries can't be generated yet." };
  }

  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

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

  if (groups.size === 0) {
    return { message: "No completed sessions with summaries found for last month." };
  }
  return { message: `Generated ${generated} of ${groups.size} monthly summaries for last month.` };
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
