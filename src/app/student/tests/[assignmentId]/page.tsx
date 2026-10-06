import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Badge, Card } from "@/components/ui";
import { TakeTestForm } from "@/components/tests/take-test-form";
import { TestResultView } from "@/components/tests/test-result-view";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, isAssignmentLate } from "@/lib/tests";

export default async function StudentTestPage(props: PageProps<"/student/tests/[assignmentId]">) {
  const { assignmentId } = await props.params;
  const session = await requireRole("STUDENT");

  const assignment = await prisma.testAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      test: {
        include: {
          professor: true,
          questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
        },
      },
      answers: true,
    },
  });
  if (!assignment || assignment.studentId !== session.userId) notFound();

  const answerByQuestionId = new Map(assignment.answers.map((a) => [a.questionId, a]));
  const late = isAssignmentLate(assignment.submittedAt, assignment.test.dueAt);
  const notYetSubmitted = assignment.status === "ASSIGNED" || assignment.status === "IN_PROGRESS";
  const overdue = notYetSubmitted && new Date() > assignment.test.dueAt;

  const questions = assignment.test.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    maxMarks: q.maxMarks,
    modelAnswer: q.modelAnswer,
    options: q.options,
    answer: answerByQuestionId.get(q.id) ?? null,
  }));

  return (
    <div>
      <Link href={sitePath(session.site, "/student/tests")} className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← All tests
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{assignment.test.title}</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {assignment.test.professor.name} · Due{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(assignment.test.dueAt)}
          </p>
          {assignment.test.description && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{assignment.test.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {late && <Badge tone="danger">Late</Badge>}
          <Badge tone={ASSIGNMENT_STATUS_TONE[assignment.status]}>{ASSIGNMENT_STATUS_LABEL[assignment.status]}</Badge>
        </div>
      </div>

      {overdue && (
        <Card className="mt-4 border-amber-300 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20">
          <p className="text-sm text-amber-800 dark:text-amber-300">
            This test is past its due date, but you can still submit it — your coach will see it was submitted late.
          </p>
        </Card>
      )}

      <div className="mt-6">
        {assignment.status === "SCORE_SHARED" ? (
          <TestResultView questions={questions} totalScore={assignment.totalScore ?? 0} totalMarks={assignment.totalMarks} />
        ) : assignment.status === "SUBMITTED" || assignment.status === "GRADED" ? (
          <Card>
            <p className="text-sm text-black/60 dark:text-white/60">
              You submitted this test
              {assignment.submittedAt &&
                ` on ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(assignment.submittedAt)}`}
              . Your coach is grading it — your score will show here once they share it.
            </p>
          </Card>
        ) : (
          <TakeTestForm assignmentId={assignment.id} disabled={false} questions={questions} />
        )}
      </div>
    </div>
  );
}
