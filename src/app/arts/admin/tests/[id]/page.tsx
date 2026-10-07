import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { getAllStudents, ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, QUESTION_TYPE_LABEL, isAssignmentLate } from "@/lib/tests";
import { sitePath } from "@/lib/site";
import { Badge, Card } from "@/components/ui";
import { AddQuestionForm } from "@/components/tests/add-question-form";
import { ImportQuestionsForm } from "@/components/tests/import-questions-form";
import { DeleteQuestionButton } from "@/components/tests/delete-question-button";
import { AssignTestForm } from "@/components/tests/assign-test-form";
import { ExtendDueDateForm } from "@/components/tests/extend-due-date-form";

export default async function AdminTestDetailPage(props: PageProps<"/arts/admin/tests/[id]">) {
  const { id } = await props.params;
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      professor: true,
      questions: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      assignments: { include: { student: true }, orderBy: { assignedAt: "desc" } },
    },
  });
  if (!test || test.site !== session.site) notFound();

  const totalMarks = test.questions.reduce((sum, q) => sum + q.maxMarks, 0);
  const ownedByMe = test.professorId === session.userId;

  // An admin only gets the full build/grade UI for tests they created
  // themselves (see "Allow admin to initiate test for any student") — tests
  // other professors created stay a read-only oversight view, same as before.
  if (!ownedByMe) {
    return (
      <div>
        <Link href={sitePath(session.site, "/admin/tests")} className="text-sm text-black/50 hover:underline dark:text-white/50">
          ← All tests
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{test.title}</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          By {test.professor.name} · Due {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(test.dueAt)} ·{" "}
          {test.durationMinutes} min time limit
        </p>
        {test.description && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{test.description}</p>}

        <Card className="mt-4">
          <h2 className="font-semibold">
            Questions ({test.questions.length}, {totalMarks} point{totalMarks === 1 ? "" : "s"})
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {test.questions.map((q, i) => (
              <li key={q.id}>
                Q{i + 1}. {q.prompt} — {QUESTION_TYPE_LABEL[q.type]}, {q.maxMarks} pt{q.maxMarks === 1 ? "" : "s"}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="mt-4 p-0">
          <h2 className="p-4 pb-0 font-semibold">Assignments ({test.assignments.length})</h2>
          <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
            {test.assignments.map((a) => {
              const late = isAssignmentLate(a.submittedAt, test.dueAt);
              return (
                <Link
                  key={a.id}
                  href={sitePath(session.site, `/admin/tests/${test.id}/assignments/${a.id}`)}
                  className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                >
                  <span className="font-medium">{a.student.name}</span>
                  <div className="flex items-center gap-2">
                    {late && <Badge tone="danger">Late</Badge>}
                    <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABEL[a.status]}</Badge>
                    {a.totalScore !== null && (
                      <span className="text-black/60 dark:text-white/60">
                        {a.totalScore} / {a.totalMarks}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
            {test.assignments.length === 0 && (
              <p className="p-4 text-sm text-black/50 dark:text-white/50">Not assigned to anyone yet.</p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const allStudents = await getAllStudents(session.site);
  const assignedIds = new Set(test.assignments.map((a) => a.studentId));
  const unassignedStudents = allStudents.filter((s) => !assignedIds.has(s.id));

  return (
    <div>
      <Link href={sitePath(session.site, "/admin/tests")} className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← All tests
      </Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{test.title}</h1>
          {test.description && <p className="mt-1 text-sm text-black/60 dark:text-white/60">{test.description}</p>}
        </div>
        {!test.assignedAt && <Badge>Draft — not yet assigned</Badge>}
      </div>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Due date</p>
            <p className="text-sm text-black/60 dark:text-white/60">
              {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(test.dueAt)} · {test.durationMinutes}{" "}
              min time limit
            </p>
          </div>
          <ExtendDueDateForm testId={test.id} currentDueAt={test.dueAt.toISOString()} />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-semibold">
          Questions ({test.questions.length}, {totalMarks} point{totalMarks === 1 ? "" : "s"} total)
        </h2>
        <div className="mt-3 space-y-3">
          {test.questions.map((q, i) => (
            <div key={q.id} className="flex items-start justify-between gap-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
              <div>
                <p className="text-sm font-medium">
                  Q{i + 1}. {q.prompt}
                </p>
                <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                  {QUESTION_TYPE_LABEL[q.type]} · {q.maxMarks} point{q.maxMarks === 1 ? "" : "s"}
                </p>
                {q.type === "MULTIPLE_CHOICE" && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {q.options.map((o) => (
                      <li key={o.id} className={o.isCorrect ? "font-medium text-emerald-700 dark:text-emerald-400" : ""}>
                        {o.isCorrect ? "✓ " : "– "}
                        {o.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {!test.assignedAt && <DeleteQuestionButton questionId={q.id} />}
            </div>
          ))}
          {test.questions.length === 0 && <p className="text-sm text-black/50 dark:text-white/50">No questions yet.</p>}
        </div>

        {!test.assignedAt && (
          <div className="mt-4 space-y-4 border-t border-black/10 pt-4 dark:border-white/10">
            <AddQuestionForm testId={test.id} />
            <ImportQuestionsForm testId={test.id} />
          </div>
        )}
      </Card>

      {test.questions.length > 0 && unassignedStudents.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-semibold">Assign to students</h2>
          <AssignTestForm testId={test.id} students={unassignedStudents} />
        </Card>
      )}

      <Card className="mt-4 p-0">
        <h2 className="p-4 pb-0 font-semibold">Assignments ({test.assignments.length})</h2>
        <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
          {test.assignments.map((a) => {
            const late = isAssignmentLate(a.submittedAt, test.dueAt);
            return (
              <Link
                key={a.id}
                href={sitePath(session.site, `/admin/tests/${test.id}/assignments/${a.id}`)}
                className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
              >
                <span className="font-medium">{a.student.name}</span>
                <div className="flex items-center gap-2">
                  {late && <Badge tone="danger">Late</Badge>}
                  <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABEL[a.status]}</Badge>
                  {a.totalScore !== null && (
                    <span className="text-black/60 dark:text-white/60">
                      {a.totalScore} / {a.totalMarks}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          {test.assignments.length === 0 && (
            <p className="p-4 text-sm text-black/50 dark:text-white/50">Not assigned to anyone yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
