import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Badge, Card } from "@/components/ui";
import { GradeAssignmentForm } from "@/components/tests/grade-assignment-form";
import { ShareScoreButton } from "@/components/tests/share-score-button";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, isAssignmentLate } from "@/lib/tests";

export default async function GradeAssignmentPage(props: PageProps<"/professor/tests/[id]/assignments/[assignmentId]">) {
  const { id, assignmentId } = await props.params;
  const session = await requireRole("PROFESSOR");

  const assignment = await prisma.testAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      student: true,
      test: { include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } } },
      answers: true,
    },
  });
  if (!assignment || assignment.testId !== id || assignment.test.professorId !== session.userId) notFound();

  const answerByQuestionId = new Map(assignment.answers.map((a) => [a.questionId, a]));
  const questions = assignment.test.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    maxMarks: q.maxMarks,
    modelAnswer: q.modelAnswer,
    options: q.options,
    answer: answerByQuestionId.get(q.id) ?? null,
  }));

  const late = isAssignmentLate(assignment.submittedAt, assignment.test.dueAt);
  const canGrade = assignment.status !== "ASSIGNED" && assignment.status !== "IN_PROGRESS";

  return (
    <div>
      <Link
        href={sitePath(session.site, `/professor/tests/${id}`)}
        className="text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← {assignment.test.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{assignment.student.name}</h1>
        <div className="flex items-center gap-2">
          {late && <Badge tone="danger">Late</Badge>}
          <Badge tone={ASSIGNMENT_STATUS_TONE[assignment.status]}>{ASSIGNMENT_STATUS_LABEL[assignment.status]}</Badge>
        </div>
      </div>

      {!canGrade && (
        <Card className="mt-6">
          <p className="text-sm text-black/60 dark:text-white/60">
            {assignment.student.name} hasn&apos;t submitted this test yet — nothing to grade.
          </p>
        </Card>
      )}

      {canGrade && (
        <>
          <Card className="mt-6">
            <GradeAssignmentForm assignmentId={assignment.id} questions={questions} />
          </Card>

          <Card className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Total score</p>
                <p className="text-lg font-semibold">
                  {assignment.totalScore ?? 0} / {assignment.totalMarks}
                </p>
              </div>
              {assignment.status === "SCORE_SHARED" ? (
                <p className="text-sm text-black/50 dark:text-white/50">
                  Shared with {assignment.student.name} on{" "}
                  {assignment.scoreSharedAt &&
                    new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(assignment.scoreSharedAt)}
                  .
                </p>
              ) : assignment.status === "GRADED" ? (
                <ShareScoreButton assignmentId={assignment.id} />
              ) : (
                <p className="text-sm text-black/50 dark:text-white/50">Save grades to enable sharing.</p>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
