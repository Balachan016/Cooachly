import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Card } from "@/components/ui";
import { ClassLogRow } from "./class-log-row";
import { GenerateMonthlyButton } from "./generate-monthly-button";

export default async function ClassLogsPage() {
  const session = await requireRole("ADMIN");

  const [bookings, monthlySummaries] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "COMPLETED", professor: { site: session.site } },
      orderBy: { startAt: "desc" },
      take: 200,
      include: { student: true, professor: true },
    }),
    prisma.monthlySummary.findMany({
      where: { professor: { site: session.site } },
      orderBy: { periodStart: "desc" },
      take: 50,
      include: { student: true, professor: true },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Class logs</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Every completed session&apos;s transcript and AI summary, plus monthly progress recaps per student.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Monthly summaries</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Generates one recap per student/professor pair from last month&apos;s completed session summaries.
        </p>
        <div className="mt-4">
          <GenerateMonthlyButton />
        </div>

        {monthlySummaries.length > 0 && (
          <div className="mt-6 space-y-4 border-t border-black/10 pt-4 dark:border-white/10">
            {monthlySummaries.map((m) => (
              <div key={m.id} className="rounded-lg bg-black/5 p-4 text-sm dark:bg-white/5">
                <div className="font-medium">
                  {m.student.name} &amp; {m.professor.name} — {m.subject}
                </div>
                <div className="text-black/50 dark:text-white/50">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(m.periodStart)} –{" "}
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(m.periodEnd)} &middot;{" "}
                  {m.sessionCount} session{m.sessionCount === 1 ? "" : "s"}
                </div>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-black/80 dark:text-white/80">
                  {m.summary}
                </pre>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6 p-0">
        <div className="p-4">
          <h2 className="font-semibold">Individual class logs</h2>
        </div>
        <div className="divide-y divide-black/5 px-4 dark:divide-white/5">
          {bookings.map((b) => (
            <ClassLogRow key={b.id} booking={b} />
          ))}
          {bookings.length === 0 && (
            <p className="pb-4 text-sm text-black/50 dark:text-white/50">No completed sessions yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
