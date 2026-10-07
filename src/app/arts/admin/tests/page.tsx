import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Badge, Button, Card } from "@/components/ui";

export default async function AdminTestsPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const tests = await prisma.test.findMany({
    where: { site: session.site },
    orderBy: { createdAt: "desc" },
    include: { professor: true, questions: { select: { id: true } }, assignments: { select: { status: true } } },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tests</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Every test created by professors on this site, plus any you create yourself.
          </p>
        </div>
        <Link href={sitePath(session.site, "/admin/tests/new")}>
          <Button>Create test</Button>
        </Link>
      </div>

      <div className="mt-6 space-y-3">
        {tests.map((test) => {
          const submitted = test.assignments.filter((a) => a.status === "SUBMITTED").length;
          const shared = test.assignments.filter((a) => a.status === "SCORE_SHARED").length;
          return (
            <Link key={test.id} href={sitePath(session.site, `/admin/tests/${test.id}`)}>
              <Card className="transition-colors hover:border-brand-600/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{test.title}</p>
                    <p className="text-sm text-black/50 dark:text-white/50">
                      {test.professor.name} · {test.questions.length} question{test.questions.length === 1 ? "" : "s"} · Due{" "}
                      {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(test.dueAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!test.assignedAt && <Badge>Draft</Badge>}
                    {test.assignments.length > 0 && <Badge>{test.assignments.length} assigned</Badge>}
                    {submitted > 0 && <Badge tone="warning">{submitted} to grade</Badge>}
                    {shared > 0 && <Badge tone="success">{shared} scored</Badge>}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {tests.length === 0 && (
          <Card>
            <p className="text-sm text-black/50 dark:text-white/50">No tests created yet.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
