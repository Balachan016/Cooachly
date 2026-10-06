import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE, isAssignmentLate } from "@/lib/tests";
import { Badge, Card } from "@/components/ui";

export default async function StudentTestsPage() {
  const session = await requireRole("STUDENT");

  const assignments = await prisma.testAssignment.findMany({
    where: { studentId: session.userId },
    include: { test: { include: { professor: true } } },
    orderBy: { assignedAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Tests</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">Tests your coach has assigned you.</p>

      <div className="mt-6 space-y-3">
        {assignments.map((a) => {
          const late = isAssignmentLate(a.submittedAt, a.test.dueAt);
          return (
            <Link key={a.id} href={sitePath(session.site, `/student/tests/${a.id}`)}>
              <Card className="transition-colors hover:border-brand-600/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{a.test.title}</p>
                    <p className="text-sm text-black/50 dark:text-white/50">
                      {a.test.professor.name} · Due{" "}
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(a.test.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {late && <Badge tone="danger">Late</Badge>}
                    <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABEL[a.status]}</Badge>
                    {a.status === "SCORE_SHARED" && a.totalScore !== null && (
                      <span className="text-sm font-medium">
                        {a.totalScore} / {a.totalMarks}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {assignments.length === 0 && (
          <Card>
            <p className="text-sm text-black/50 dark:text-white/50">No tests assigned yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
