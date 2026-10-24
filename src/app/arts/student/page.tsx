import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { sitePath } from "@/lib/site";
import { Badge, Button, Card, Select } from "@/components/ui";
import { ContactInfoForm } from "@/components/contact-info-form";
import { PersonOverviewCalendar } from "@/components/person-overview-calendar";
import { buildPersonMonthOverview } from "@/lib/person-overview-calendar";
import { currentYearMonth, parseMonthParam, monthParamValue, monthReferenceDate } from "@/lib/month-nav";
import { MonthNav } from "@/components/month-nav";

export default async function StudentDashboardPage(props: PageProps<"/arts/student">) {
  const user = await getCurrentUser();
  if (!user) return null;

  const searchParams = await props.searchParams;
  const monthParam = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const selectedMonth = parseMonthParam(monthParam, currentYearMonth(user.timezone));
  const professorFilter = typeof searchParams.professor === "string" ? searchParams.professor : "";
  const statusFilter = searchParams.status === "booked" || searchParams.status === "available" ? searchParams.status : undefined;
  const overviewHref = (overrides: { month?: string; professor?: string; status?: string }) => {
    const params = new URLSearchParams();
    params.set("month", overrides.month ?? monthParamValue(selectedMonth));
    const professor = overrides.professor ?? professorFilter;
    const status = overrides.status ?? statusFilter ?? "";
    if (professor) params.set("professor", professor);
    if (status) params.set("status", status);
    return `?${params.toString()}`;
  };

  const [upcoming, pendingTests, monthOverview, scheduleGurus] = await Promise.all([
    prisma.booking.findMany({
      where: { studentId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { professor: true },
    }),
    prisma.testAssignment.findMany({
      where: { studentId: user.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
      orderBy: { assignedAt: "desc" },
      include: { test: true },
    }),
    buildPersonMonthOverview({
      role: "STUDENT",
      userId: user.id,
      viewerTimezone: user.timezone,
      reference: monthReferenceDate(selectedMonth),
      professorId: professorFilter || undefined,
      status: statusFilter,
    }),
    prisma.user.findMany({
      where: { role: "PROFESSOR", bookingsAsProfessor: { some: { studentId: user.id, status: { in: ["CONFIRMED", "COMPLETED"] } } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Times shown in your timezone: {user.timezone}.
        {user.code && (
          <>
            {" "}
            Your student code: <span className="font-mono">{user.code}</span>.
          </>
        )}
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">{monthOverview.monthLabel} — your schedule</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Your booked classes this month, plus any open slots you could still book with your gurus.
        </p>

        <div className="mt-4">
          <MonthNav current={selectedMonth} hrefFor={(ym) => overviewHref({ month: monthParamValue(ym) })} />
        </div>

        {scheduleGurus.length > 0 && (
          <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="month" value={monthParamValue(selectedMonth)} />
            <div className="w-56">
              <label htmlFor="professor" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                Guru
              </label>
              <Select id="professor" name="professor" defaultValue={professorFilter}>
                <option value="">All gurus</option>
                {scheduleGurus.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="w-44">
              <label htmlFor="status" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                Status
              </label>
              <Select id="status" name="status" defaultValue={statusFilter ?? ""}>
                <option value="">Booked &amp; open</option>
                <option value="booked">Booked only</option>
                <option value="available">Open only</option>
              </Select>
            </div>
            <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
              Filter
            </button>
            {(professorFilter || statusFilter) && (
              <a href={overviewHref({ professor: "", status: "" })} className="text-sm font-medium text-black/50 hover:underline dark:text-white/50">
                Clear filters
              </a>
            )}
          </form>
        )}

        <div className="mt-4">
          <PersonOverviewCalendar month={monthOverview} />
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Upcoming sessions</h2>
          <Link href={sitePath(user.site, "/student/professors")}>
            <Button variant="secondary">Book a session</Button>
          </Link>
        </div>
        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{b.professor.name}</div>
                <div className="text-sm text-black/50 dark:text-white/50">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(b.startAt)}
                </div>
              </div>
              <Badge tone={b.status === "CONFIRMED" ? "success" : "default"}>{b.status}</Badge>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-3 text-sm text-black/50 dark:text-white/50">No upcoming sessions yet.</p>}
        </div>
      </Card>

      {pendingTests.length > 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold">Pending tests</h2>
          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            {pendingTests.map((a) => {
              const overdue = new Date() > a.test.dueAt;
              return (
                <Link
                  key={a.id}
                  href={sitePath(user.site, `/student/tests/${a.id}`)}
                  className="flex items-center justify-between gap-2 py-3 hover:underline"
                >
                  <div>
                    <div className="font-medium">{a.test.title}</div>
                    <div className="text-sm text-black/50 dark:text-white/50">
                      Due {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(a.test.dueAt)}
                    </div>
                  </div>
                  <Badge tone={overdue ? "danger" : "warning"}>{overdue ? "Due" : "Pending"}</Badge>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      <h2 className="mt-8 text-lg font-semibold">Contact info</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Add your phone number to get session reminders by SMS/WhatsApp in addition to email.
      </p>
      <Card className="mt-4 max-w-xl">
        <ContactInfoForm timezone={user.timezone} phone={user.phone} />
      </Card>
    </div>
  );
}
