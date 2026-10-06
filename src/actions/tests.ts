"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { uploadFile, isBlobConfigured } from "@/lib/blob";
import { autoGradeMultipleChoice, sumAwardedMarks } from "@/lib/tests";
import { sendTestAssignedEmail, sendTestScoreSharedEmail } from "@/lib/notifications/tests";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export type TestFormState = { message?: string; success?: true } | undefined;

// ---------- Professor: build a test ----------

const CreateTestSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  dueAt: z.string().min(1, "Please choose a due date."),
});

export async function createTest(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");

  const parsed = CreateTestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    dueAt: formData.get("dueAt"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in all fields." };

  const professor = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!professor) return { message: "Professor not found." };

  // The due-date picker shows in the professor's own browser clock; convert
  // it using their stored timezone rather than the server's (Vercel runs in
  // UTC), or a due date entered as "6pm" could silently save as 6pm UTC.
  let dueAt: Date;
  try {
    dueAt = fromZonedTime(parsed.data.dueAt, professor.timezone);
  } catch {
    return { message: "Invalid due date." };
  }
  if (Number.isNaN(dueAt.getTime())) return { message: "Invalid due date." };

  const test = await prisma.test.create({
    data: {
      site: session.site,
      professorId: session.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      dueAt,
    },
  });

  redirect(sitePath(session.site, `/professor/tests/${test.id}`));
}

const AddQuestionSchema = z.object({
  testId: z.string().min(1),
  type: z.enum(["MULTIPLE_CHOICE", "SHORT_ANSWER", "LONG_ANSWER", "FILE_UPLOAD"]),
  prompt: z.string().trim().min(1, "Please enter the question."),
  maxMarks: z.coerce.number().int().min(1, "Points must be at least 1.").max(1000),
});

export async function addQuestion(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");

  const parsed = AddQuestionSchema.safeParse({
    testId: formData.get("testId"),
    type: formData.get("type"),
    prompt: formData.get("prompt"),
    maxMarks: formData.get("maxMarks"),
  });
  if (!parsed.success) return { message: parsed.error.issues[0]?.message ?? "Please fill in the question." };

  const test = await prisma.test.findUnique({ where: { id: parsed.data.testId } });
  if (!test || test.professorId !== session.userId) return { message: "Test not found." };
  if (test.assignedAt) return { message: "This test has already been assigned, so its questions are locked." };

  let options: { text: string; isCorrect: boolean }[] = [];
  if (parsed.data.type === "MULTIPLE_CHOICE") {
    const optionTexts = formData.getAll("optionText").map((v) => String(v).trim());
    const correctIndex = Number(formData.get("correctOption") ?? -1);
    if (optionTexts.length < 2 || optionTexts.some((t) => t.length === 0)) {
      return { message: "Add at least two options, and make sure none are left empty." };
    }
    if (correctIndex < 0 || correctIndex >= optionTexts.length) {
      return { message: "Please mark which option is correct." };
    }
    options = optionTexts.map((text, i) => ({ text, isCorrect: i === correctIndex }));
  }

  const lastQuestion = await prisma.testQuestion.findFirst({ where: { testId: test.id }, orderBy: { order: "desc" } });
  const order = (lastQuestion?.order ?? -1) + 1;

  await prisma.testQuestion.create({
    data: {
      testId: test.id,
      order,
      type: parsed.data.type,
      prompt: parsed.data.prompt,
      maxMarks: parsed.data.maxMarks,
      options: options.length > 0 ? { create: options.map((o, i) => ({ order: i, text: o.text, isCorrect: o.isCorrect })) } : undefined,
    },
  });

  revalidatePath(sitePath(session.site, `/professor/tests/${test.id}`));
  return { message: "Question added.", success: true };
}

export async function deleteQuestion(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");
  const questionId = String(formData.get("questionId") || "");

  const question = await prisma.testQuestion.findUnique({ where: { id: questionId }, include: { test: true } });
  if (!question || question.test.professorId !== session.userId) return { message: "Question not found." };
  if (question.test.assignedAt) return { message: "This test has already been assigned, so its questions are locked." };

  await prisma.testQuestion.delete({ where: { id: questionId } });

  revalidatePath(sitePath(session.site, `/professor/tests/${question.testId}`));
  return { success: true };
}

export async function assignTest(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");
  const testId = String(formData.get("testId") || "");
  const studentIds = formData.getAll("studentIds").map(String).filter(Boolean);
  if (studentIds.length === 0) return { message: "Pick at least one student to assign this test to." };

  const test = await prisma.test.findUnique({ where: { id: testId }, include: { questions: true } });
  if (!test || test.professorId !== session.userId) return { message: "Test not found." };
  if (test.questions.length === 0) return { message: "Add at least one question before assigning this test." };

  const existing = await prisma.testAssignment.findMany({ where: { testId }, select: { studentId: true } });
  const alreadyAssigned = new Set(existing.map((a) => a.studentId));
  const newStudentIds = studentIds.filter((id) => !alreadyAssigned.has(id));
  if (newStudentIds.length === 0) return { message: "Those students are already assigned this test." };

  const [students, professor] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: newStudentIds }, role: "STUDENT", site: session.site } }),
    prisma.user.findUnique({ where: { id: session.userId } }),
  ]);
  if (!professor) return { message: "Professor not found." };

  const totalMarks = test.questions.reduce((sum, q) => sum + q.maxMarks, 0);

  const assignments = await prisma.$transaction(
    students.map((student) => prisma.testAssignment.create({ data: { testId, studentId: student.id, totalMarks } }))
  );

  if (!test.assignedAt) {
    await prisma.test.update({ where: { id: testId }, data: { assignedAt: new Date() } });
  }

  for (const assignment of assignments) {
    const student = students.find((s) => s.id === assignment.studentId);
    if (student) await sendTestAssignedEmail(test, assignment, student, professor);
  }

  revalidatePath(sitePath(session.site, `/professor/tests/${testId}`));
  return { message: `Assigned to ${assignments.length} student${assignments.length === 1 ? "" : "s"}.`, success: true };
}

const ExtendDueDateSchema = z.object({ testId: z.string().min(1), dueAt: z.string().min(1) });

export async function extendTestDueDate(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");
  const parsed = ExtendDueDateSchema.safeParse({ testId: formData.get("testId"), dueAt: formData.get("dueAt") });
  if (!parsed.success) return { message: "Please choose a date." };

  const test = await prisma.test.findUnique({ where: { id: parsed.data.testId } });
  if (!test || test.professorId !== session.userId) return { message: "Test not found." };

  const professor = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!professor) return { message: "Professor not found." };

  let dueAt: Date;
  try {
    dueAt = fromZonedTime(parsed.data.dueAt, professor.timezone);
  } catch {
    return { message: "Invalid date." };
  }
  if (Number.isNaN(dueAt.getTime())) return { message: "Invalid date." };

  await prisma.test.update({ where: { id: test.id }, data: { dueAt } });

  revalidatePath(sitePath(session.site, `/professor/tests/${test.id}`));
  return { message: "Due date updated.", success: true };
}

const LOCKED_STATUSES = ["SUBMITTED", "GRADED", "SCORE_SHARED"] as const;

// ---------- Student: take a test ----------

export type SaveAnswerResult = { success: boolean; message?: string };

/** Autosaves one question's answer as the student fills it in. Callable directly from a client component. */
export async function saveAnswer(
  assignmentId: string,
  questionId: string,
  value: { selectedOptionId?: string; textAnswer?: string }
): Promise<SaveAnswerResult> {
  const session = await requireRole("STUDENT");

  const assignment = await prisma.testAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.studentId !== session.userId) return { success: false, message: "Not found." };
  if ((LOCKED_STATUSES as readonly string[]).includes(assignment.status)) {
    return { success: false, message: "This test has already been submitted." };
  }

  const question = await prisma.testQuestion.findFirst({
    where: { id: questionId, testId: assignment.testId },
    include: { options: true },
  });
  if (!question) return { success: false, message: "Question not found." };

  let marksAwarded: number | null = null;
  if (question.type === "MULTIPLE_CHOICE" && value.selectedOptionId) {
    const option = question.options.find((o) => o.id === value.selectedOptionId);
    marksAwarded = autoGradeMultipleChoice(option?.isCorrect, question.maxMarks);
  }

  await prisma.testAnswer.upsert({
    where: { assignmentId_questionId: { assignmentId, questionId } },
    create: {
      assignmentId,
      questionId,
      selectedOptionId: value.selectedOptionId || null,
      textAnswer: value.textAnswer || null,
      marksAwarded,
    },
    update: {
      selectedOptionId: value.selectedOptionId ?? undefined,
      textAnswer: value.textAnswer ?? undefined,
      marksAwarded,
    },
  });

  if (assignment.status === "ASSIGNED") {
    await prisma.testAssignment.update({ where: { id: assignmentId }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
  }

  return { success: true };
}

export async function saveFileAnswer(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("STUDENT");
  const assignmentId = String(formData.get("assignmentId") || "");
  const questionId = String(formData.get("questionId") || "");

  const assignment = await prisma.testAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.studentId !== session.userId) return { message: "Not found." };
  if ((LOCKED_STATUSES as readonly string[]).includes(assignment.status)) {
    return { message: "This test has already been submitted." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { message: "Please choose a file." };
  if (file.size > MAX_FILE_SIZE_BYTES) return { message: "File is too large (max 8MB)." };
  if (!isBlobConfigured) return { message: "File storage isn't configured yet. Ask an admin to set up Vercel Blob." };

  const uploaded = await uploadFile({ pathname: `tests/${assignmentId}/${questionId}-${file.name}`, file });
  if (!uploaded) return { message: "Upload failed. Please try again." };

  await prisma.testAnswer.upsert({
    where: { assignmentId_questionId: { assignmentId, questionId } },
    create: { assignmentId, questionId, fileName: file.name, fileUrl: uploaded.url },
    update: { fileName: file.name, fileUrl: uploaded.url },
  });

  if (assignment.status === "ASSIGNED") {
    await prisma.testAssignment.update({ where: { id: assignmentId }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
  }

  revalidatePath(sitePath(session.site, `/student/tests/${assignmentId}`));
  return { message: "Uploaded.", success: true };
}

export async function submitTest(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("STUDENT");
  const assignmentId = String(formData.get("assignmentId") || "");

  const assignment = await prisma.testAssignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.studentId !== session.userId) return { message: "Not found." };
  if ((LOCKED_STATUSES as readonly string[]).includes(assignment.status)) {
    return { message: "This test has already been submitted." };
  }

  await prisma.testAssignment.update({
    where: { id: assignmentId },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  revalidatePath(sitePath(session.site, `/student/tests/${assignmentId}`));
  revalidatePath(sitePath(session.site, "/student/tests"));
  return { message: "Test submitted. Your coach will grade it soon.", success: true };
}

// ---------- Professor: grade + share ----------

export async function saveGrades(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");
  const assignmentId = String(formData.get("assignmentId") || "");

  const assignment = await prisma.testAssignment.findUnique({
    where: { id: assignmentId },
    include: { test: { include: { questions: true } } },
  });
  if (!assignment || assignment.test.professorId !== session.userId) return { message: "Not found." };
  if (assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS") {
    return { message: "The student hasn't submitted this test yet." };
  }

  await prisma.$transaction(
    assignment.test.questions.map((question) => {
      const marksRaw = formData.get(`marks-${question.id}`);
      const commentRaw = formData.get(`comment-${question.id}`);
      const marks =
        marksRaw !== null && String(marksRaw).trim() !== ""
          ? Math.max(0, Math.min(question.maxMarks, Math.round(Number(marksRaw))))
          : null;
      const comment = commentRaw ? String(commentRaw).trim() || null : null;

      return prisma.testAnswer.upsert({
        where: { assignmentId_questionId: { assignmentId, questionId: question.id } },
        create: { assignmentId, questionId: question.id, marksAwarded: marks, comment },
        update: { marksAwarded: marks, comment },
      });
    })
  );

  const refreshed = await prisma.testAssignment.findUnique({ where: { id: assignmentId }, include: { answers: true } });
  if (!refreshed) return { message: "Not found." };
  const totalScore = sumAwardedMarks(refreshed);

  await prisma.testAssignment.update({
    where: { id: assignmentId },
    data: {
      // Already shared? Keep it shared — the student just sees the updated
      // total immediately rather than this silently un-sharing their score.
      status: refreshed.status === "SCORE_SHARED" ? "SCORE_SHARED" : "GRADED",
      gradedAt: new Date(),
      totalScore,
    },
  });

  revalidatePath(sitePath(session.site, `/professor/tests/${assignment.testId}`));
  return { message: "Grades saved.", success: true };
}

export async function shareTestScore(_state: TestFormState, formData: FormData): Promise<TestFormState> {
  const session = await requireRole("PROFESSOR");
  const assignmentId = String(formData.get("assignmentId") || "");

  const assignment = await prisma.testAssignment.findUnique({
    where: { id: assignmentId },
    include: { test: true, student: true },
  });
  if (!assignment || assignment.test.professorId !== session.userId) return { message: "Not found." };
  if (assignment.status === "SCORE_SHARED") return { message: "The score has already been shared." };
  if (assignment.status !== "GRADED" || assignment.totalScore === null) {
    return { message: "Grade this test before sharing the score." };
  }

  const professor = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!professor) return { message: "Professor not found." };

  const updated = await prisma.testAssignment.update({
    where: { id: assignmentId },
    data: { status: "SCORE_SHARED", scoreSharedAt: new Date() },
  });

  await sendTestScoreSharedEmail(assignment.test, updated, assignment.student, professor);

  revalidatePath(sitePath(session.site, `/professor/tests/${assignment.testId}`));
  revalidatePath(sitePath(session.site, `/student/tests/${assignmentId}`));
  return { message: "Score shared with the student.", success: true };
}
