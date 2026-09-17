"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { summarizeMonth, isAiSummaryConfigured } from "@/lib/ai-summary";

/**
 * Generates a monthly progress recap per (student, professor, subject) for
 * the most recently completed calendar month, from that month's individual
 * session summaries. Safe to re-run — re-generating a month overwrites its
 * existing recap rather than duplicating it.
 */
export async function generateMonthlySummaries(): Promise<{ message: string }> {
  await requireRole("ADMIN");

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

  revalidatePath("/admin/class-logs");

  if (groups.size === 0) {
    return { message: "No completed sessions with summaries found for last month." };
  }
  return { message: `Generated ${generated} of ${groups.size} monthly summaries for last month.` };
}
