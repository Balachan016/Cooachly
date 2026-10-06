import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Badge } from "@/components/ui";
import { TestResultView } from "@/components/tests/test-result-view";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE } from "@/lib/tests";

export default async function AdminAssignmentDetailPage(props: PageProps<"/admin/tests/[id]/assignments/[assignmentId]">) {
  const { id, assignmentId } = await props.params;
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const assignment = await prisma.testAssignment.findUnique({
    where: { id: assignmentId },
    include: {
      student: true,
      test: { include: { questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } } } },
      answers: true,
    },
  });
  if (!assignment || assignment.testId !== id || assignment.test.site !== session.site) notFound();

  const answerByQuestionId = new Map(assignment.answers.map((a) => [a.questionId, a]));
  const questions = assignment.test.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    maxMarks: q.maxMarks,
    options: q.options,
    answer: answerByQuestionId.get(q.id) ?? null,
  }));

  return (
    <div>
      <Link
        href={sitePath(session.site, `/admin/tests/${id}`)}
        className="text-sm text-black/50 hover:underline dark:text-white/50"
      >
        ← {assignment.test.title}
      </Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{assignment.student.name}</h1>
        <Badge tone={ASSIGNMENT_STATUS_TONE[assignment.status]}>{ASSIGNMENT_STATUS_LABEL[assignment.status]}</Badge>
      </div>
      <div className="mt-6">
        <TestResultView questions={questions} totalScore={assignment.totalScore ?? 0} totalMarks={assignment.totalMarks} />
      </div>
    </div>
  );
}
