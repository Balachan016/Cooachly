import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card, Select } from "@/components/ui";
import { buildAdminMonthOverview, type OverviewFilters } from "@/lib/admin-overview-calendar";
import { TestNotificationButton } from "./test-notification-button";
import { MonthOverviewCalendar } from "./month-overview-calendar";
import { currentYearMonth, parseMonthParam, monthParamValue, monthReferenceDate } from "@/lib/month-nav";
import { MonthNav } from "@/components/month-nav";

export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  const session = await requireRole("ADMIN");
  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";
  const searchParams = await props.searchParams;
  const professorFilter = typeof searchParams.professor === "string" ? searchParams.professor : "";
  const studentFilter = typeof searchParams.student === "string" ? searchParams.student : "";
  const statusFilter = searchParams.status === "booked" || searchParams.status === "available" ? searchParams.status : "";
  const hasOverviewFilters = Boolean(professorFilter || studentFilter || statusFilter);
  const monthParam = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const selectedMonth = parseMonthParam(monthParam, currentYearMonth(viewerTimezone));
  const monthHref = (ym: { year: number; month: number }) => {
    const params = new URLSearchParams();
    if (studentFilter) params.set("student", studentFilter);
    if (professorFilter) params.set("professor", professorFilter);
    if (statusFilter) params.set("status", statusFilter);
    params.set("month", monthParamValue(ym));
    return `${sitePath(session.site, "/admin")}?${params.toString()}`;
  };

  const filters: OverviewFilters = {
    professorId: professorFilter || undefined,
    studentId: studentFilter || undefined,
    status: statusFilter || undefined,
  };

  const [userCount, professorCount, studentCount, bookingCount, monthOverview, allProfessors, allStudents] = await Promise.all([
    prisma.user.count({ where: { site: session.site } }),
    prisma.user.count({ where: { role: "PROFESSOR", site: session.site } }),
    prisma.user.count({ where: { role: "STUDENT", site: session.site } }),
    prisma.booking.count({ where: { professor: { site: session.site } } }),
    buildAdminMonthOverview(session.site, viewerTimezone, monthReferenceDate(selectedMonth), filters),
    prisma.user.findMany({
      where: { role: "PROFESSOR", site: session.site },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", site: session.site },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        A snapshot of activity across the platform.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={userCount} />
        <Stat label="Professors" value={professorCount} />
        <Stat label="Students" value={studentCount} />
        <Stat label="Total bookings" value={bookingCount} />
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">{monthOverview.monthLabel} — bookings &amp; availability</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Every booking and every still-open availability window this month, across all professors, by name.
        </p>

        <div className="mt-4">
          <MonthNav current={selectedMonth} hrefFor={monthHref} />
        </div>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="month" value={monthParamValue(selectedMonth)} />
          <div className="w-56">
            <label htmlFor="student" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Student
            </label>
            <Select id="student" name="student" defaultValue={studentFilter}>
              <option value="">All students</option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="w-56">
            <label htmlFor="professor" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
              Professor
            </label>
            <Select id="professor" name="professor" defaultValue={professorFilter}>
              <option value="">All professors</option>
              {allProfessors.map((p) => (
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
            <Select id="status" name="status" defaultValue={statusFilter}>
              <option value="">Booked &amp; open</option>
              <option value="booked">Booked only</option>
              <option value="available">Open only</option>
            </Select>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            Filter
          </button>
          {hasOverviewFilters && (
            <a
              href={`${sitePath(session.site, "/admin")}?month=${monthParamValue(selectedMonth)}`}
              className="text-sm font-medium text-black/50 hover:underline dark:text-white/50"
            >
              Clear filters
            </a>
          )}
        </form>

        <div className="mt-4">
          <MonthOverviewCalendar month={monthOverview} viewerTimezone={viewerTimezone} />
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Test notifications</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Sends a test email, WhatsApp message, and SMS (with a video call join link) to your own
          account, so you can confirm Resend, Twilio, and Daily.co are wired up correctly.
        </p>
        <div className="mt-4">
          <TestNotificationButton />
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}
