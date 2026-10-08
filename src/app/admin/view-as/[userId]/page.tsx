import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { ASSIGNMENT_STATUS_LABEL, ASSIGNMENT_STATUS_TONE } from "@/lib/tests";
import { Badge, Card } from "@/components/ui";

export default async function AdminViewAsPage(props: PageProps<"/admin/view-as/[userId]">) {
  const { userId } = await props.params;
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { studentProfile: true, professorProfile: true },
  });
  if (!user || user.site !== session.site || (user.role !== "STUDENT" && user.role !== "PROFESSOR")) notFound();

  const isStudent = user.role === "STUDENT";

  const [bookings, monthlySummaries, testAssignments, testsCreated] = await Promise.all([
    prisma.booking.findMany({
      where: isStudent ? { studentId: user.id } : { professorId: user.id },
      orderBy: { startAt: "desc" },
      take: 20,
      include: { student: true, professor: true },
    }),
    prisma.monthlySummary.findMany({
      where: { studentId: user.id },
      orderBy: { periodStart: "desc" },
      take: 10,
      include: { professor: true },
    }),
    prisma.testAssignment.findMany({
      where: { studentId: user.id },
      orderBy: { assignedAt: "desc" },
      take: 20,
      include: { test: true },
    }),
    prisma.test.findMany({
      where: { professorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { _count: { select: { assignments: true } } },
    }),
  ]);

  return (
    <div>
      <Link href={sitePath(session.site, "/admin/users")} className="text-sm text-black/50 hover:underline dark:text-white/50">
        ← All users
      </Link>

      <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
        Read-only — you&apos;re viewing {user.name}&apos;s account as an admin. Nothing here can be edited or sent on their behalf.
      </div>

      <h1 className="mt-4 text-2xl font-semibold">{user.name}</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        {isStudent ? "Student" : "Professor"} · {user.email}
        {user.phone ? ` · ${user.phone}` : ""} · {user.timezone}
      </p>

      {isStudent && user.studentProfile && (
        <Card className="mt-4">
          <h2 className="font-semibold">Student profile</h2>
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">
            {[
              user.studentProfile.country,
              user.studentProfile.curriculumLevel,
              user.studentProfile.curriculum,
              user.studentProfile.grade ? `Grade ${user.studentProfile.grade}` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "No profile details on file."}
          </p>
          {user.studentProfile.syllabusFileUrl && (
            <a
              href={user.studentProfile.syllabusFileUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
            >
              Syllabus
            </a>
          )}
        </Card>
      )}

      {!isStudent && user.professorProfile && (
        <Card className="mt-4">
          <h2 className="font-semibold">Professor profile</h2>
          <p className="mt-2 text-sm font-medium">{user.professorProfile.headline || "No headline on file."}</p>
          <p className="mt-1 text-sm text-black/70 dark:text-white/70">{user.professorProfile.bio || "No bio on file."}</p>
          <p className="mt-2 text-xs text-black/50 dark:text-white/50">
            {user.professorProfile.subject || "No subject set"} · ${(user.professorProfile.hourlyRateCents / 100).toFixed(2)}/hr
          </p>
        </Card>
      )}

      <Card className="mt-4 p-0">
        <h2 className="p-4 pb-0 font-semibold">Bookings ({bookings.length})</h2>
        <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
          {bookings.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
              <span className="font-medium">{isStudent ? b.professor.name : b.student.name}</span>
              <span className="text-black/50 dark:text-white/50">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(b.startAt)}
              </span>
              <Badge tone={b.status === "CANCELLED" ? "danger" : b.status === "COMPLETED" ? "success" : "default"}>{b.status}</Badge>
            </div>
          ))}
          {bookings.length === 0 && <p className="p-4 text-sm text-black/50 dark:text-white/50">No bookings yet.</p>}
        </div>
      </Card>

      {isStudent ? (
        <>
          <Card className="mt-4 p-0">
            <h2 className="p-4 pb-0 font-semibold">Tests ({testAssignments.length})</h2>
            <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
              {testAssignments.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                  <span className="font-medium">{a.test.title}</span>
                  <div className="flex items-center gap-2">
                    <Badge tone={ASSIGNMENT_STATUS_TONE[a.status]}>{ASSIGNMENT_STATUS_LABEL[a.status]}</Badge>
                    {a.totalScore !== null && (
                      <span className="text-black/60 dark:text-white/60">
                        {a.totalScore} / {a.totalMarks}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {testAssignments.length === 0 && <p className="p-4 text-sm text-black/50 dark:text-white/50">No tests assigned yet.</p>}
            </div>
          </Card>

          <Card className="mt-4">
            <h2 className="font-semibold">Monthly summaries</h2>
            <div className="mt-3 space-y-3">
              {monthlySummaries.map((m) => (
                <div key={m.id} className="rounded-lg bg-black/5 p-3 text-sm dark:bg-white/5">
                  <div className="font-medium">
                    {m.professor.name} — {m.subject}
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-black/80 dark:text-white/80">{m.summary}</pre>
                </div>
              ))}
              {monthlySummaries.length === 0 && <p className="text-sm text-black/50 dark:text-white/50">No monthly summaries yet.</p>}
            </div>
          </Card>
        </>
      ) : (
        <Card className="mt-4 p-0">
          <h2 className="p-4 pb-0 font-semibold">Tests created ({testsCreated.length})</h2>
          <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
            {testsCreated.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span className="font-medium">{t.title}</span>
                <span className="text-black/60 dark:text-white/60">{t._count.assignments} assigned</span>
              </div>
            ))}
            {testsCreated.length === 0 && <p className="p-4 text-sm text-black/50 dark:text-white/50">No tests created yet.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
