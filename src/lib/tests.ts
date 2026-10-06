import "server-only";
import { prisma } from "@/lib/prisma";
import type { TestAssignmentStatus, TestQuestionType } from "@prisma/client";

export const QUESTION_TYPE_LABEL: Record<TestQuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  SHORT_ANSWER: "Short answer",
  LONG_ANSWER: "Long answer",
  FILE_UPLOAD: "File upload",
};

export const ASSIGNMENT_STATUS_LABEL: Record<TestAssignmentStatus, string> = {
  ASSIGNED: "Not started",
  IN_PROGRESS: "In progress",
  SUBMITTED: "Submitted",
  GRADED: "Graded",
  SCORE_SHARED: "Score shared",
};

export const ASSIGNMENT_STATUS_TONE: Record<TestAssignmentStatus, "default" | "success" | "warning" | "danger"> = {
  ASSIGNED: "default",
  IN_PROGRESS: "warning",
  SUBMITTED: "warning",
  GRADED: "default",
  SCORE_SHARED: "success",
};

/** The distinct students a professor has ever had a booking with, for the test-assignment picker. */
export async function getMyStudents(professorId: string) {
  const bookings = await prisma.booking.findMany({
    where: { professorId },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  if (bookings.length === 0) return [];

  return prisma.user.findMany({
    where: { id: { in: bookings.map((b) => b.studentId) } },
    orderBy: { name: "asc" },
  });
}

export function isAssignmentLate(submittedAt: Date | null, dueAt: Date): boolean {
  return submittedAt !== null && submittedAt.getTime() > dueAt.getTime();
}

/** Marks awarded for a multiple-choice answer, auto-graded against the correct option. Null if unanswered. */
export function autoGradeMultipleChoice(selectedOptionIsCorrect: boolean | undefined, maxMarks: number): number | null {
  if (selectedOptionIsCorrect === undefined) return null;
  return selectedOptionIsCorrect ? maxMarks : 0;
}

type AssignmentWithAnswers = { answers: { marksAwarded: number | null }[] };

/** Sums whatever marks have been entered so far; ungraded answers count as 0 until the professor grades them. */
export function sumAwardedMarks(assignment: AssignmentWithAnswers): number {
  return assignment.answers.reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0);
}
