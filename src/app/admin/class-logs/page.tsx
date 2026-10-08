import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card, Select } from "@/components/ui";
import { ClassLogRow } from "./class-log-row";
import { GenerateMonthlyButton } from "./generate-monthly-button";
import { GenerateForPairButton } from "./generate-for-pair-button";

export default async function ClassLogsPage(props: PageProps<"/admin/class-logs">) {
  const session = await requireRole("ADMIN");
  const searchParams = await props.searchParams;
  const studentId = typeof searchParams.student === "string" ? searchParams.student : "";
  const subject = typeof searchParams.subject === "string" ? searchParams.subject : "";

  const [bookings, monthlySummaries, students, subjectRows] = await Promise.all([
    prisma.booking.findMany({
      where: { status: "COMPLETED", professor: { site: session.site } },
      orderBy: { startAt: "desc" },
      take: 200,
      include: { student: true, professor: true },
    }),
    prisma.monthlySummary.findMany({
      where: {
        professor: { site: session.site },
        ...(studentId ? { studentId } : {}),
        ...(subject ? { subject: { equals: subject, mode: "insensitive" } } : {}),
      },
      orderBy: { periodStart: "desc" },
      take: 50,
      include: { student: true, professor: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", site: session.site, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.professorProfile.findMany({
      where: { user: { site: session.site }, subject: { not: "" } },
      select: { subject: true },
      distinct: ["subject"],
      orderBy: { subject: "asc" },
    }),
  ]);

  const subjects = subjectRows.map((r) => r.subject);
  const selectedStudent = studentId ? students.find((s) => s.id === studentId) : undefined;
  const hasFilters = Boolean(studentId || subject);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Class logs</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Every completed session&apos;s transcript and AI summary, plus monthly progress recaps per student.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Monthly summaries</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Generates one recap per student/professor pair from last month&apos;s completed session summaries. Pick a student and
          subject below to find one directly, or generate a fresh recap covering every session to date.
        </p>
        <div className="mt-4">
          <GenerateMonthlyButton />
        </div>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <div className="w-56">
            <label htmlFor="student" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Student
            </label>
            <Select id="student" name="student" defaultValue={studentId}>
              <option value="">All students</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-56">
            <label htmlFor="subject" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Subject
            </label>
            <Select id="subject" name="subject" defaultValue={subject}>
              <option value="">All subjects</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Filter
          </button>
          {hasFilters && (
            <a
              href={sitePath(session.site, "/admin/class-logs")}
              className="text-sm font-medium text-black/50 hover:underline dark:text-white/50"
            >
              Clear filters
            </a>
          )}
        </form>

        {selectedStudent && subject && (
          <div className="mt-4 border-t border-black/10 pt-4 dark:border-white/10">
            <GenerateForPairButton studentId={selectedStudent.id} subject={subject} />
          </div>
        )}

        {monthlySummaries.length > 0 ? (
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
        ) : (
          hasFilters && (
            <p className="mt-4 border-t border-black/10 pt-4 text-sm text-black/50 dark:border-white/10 dark:text-white/50">
              No summary found for this filter yet{selectedStudent && subject ? " — generate one above." : "."}
            </p>
          )
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
