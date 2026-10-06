import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, QUESTION_TYPE_LABEL, isAssignmentLate } from "@/lib/tests";
import { Badge, Card } from "@/components/ui";

export default async function AdminTestDetailPage(props: PageProps<"/admin/tests/[id]">) {
  const { id } = await props.params;
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      professor: true,
      questions: { orderBy: { order: "asc" } },
      assignments: { include: { student: true }, orderBy: { assignedAt: "desc" } },
    },
  });
  if (!test || test.site !== session.site) notFound();

  const totalMarks = test.questions.reduce((sum, q) => sum + q.maxMarks, 0);

  return (
    <div>
      <Link href={sitePath(session.site, "/admin/tests")} className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← All tests
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">{test.title}</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        By {test.professor.name} · Due {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(test.dueAt)}
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
