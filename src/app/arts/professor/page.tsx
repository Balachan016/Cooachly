import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { sitePath } from "@/lib/site";
import { Badge, Button, Card, Select } from "@/components/ui";
import { PersonOverviewCalendar } from "@/components/person-overview-calendar";
import { buildPersonMonthOverview } from "@/lib/person-overview-calendar";
import { currentAvailabilityPeriod } from "@/lib/availability-period";
import { currentYearMonth, parseMonthParam, monthParamValue, monthReferenceDate } from "@/lib/month-nav";
import { MonthNav } from "@/components/month-nav";

export default async function ProfessorDashboardPage(props: PageProps<"/arts/professor">) {
  const user = await getCurrentUser();
  if (!user) return null;

  const currentPeriod = currentAvailabilityPeriod(user.timezone);

  const searchParams = await props.searchParams;
  const monthParam = typeof searchParams.month === "string" ? searchParams.month : undefined;
  const selectedMonth = parseMonthParam(monthParam, currentYearMonth(user.timezone));
  const statusFilter = searchParams.status === "booked" || searchParams.status === "available" ? searchParams.status : undefined;
  const overviewHref = (overrides: { month?: string; status?: string }) => {
    const params = new URLSearchParams();
    params.set("month", overrides.month ?? monthParamValue(selectedMonth));
    const status = overrides.status ?? statusFilter ?? "";
    if (status) params.set("status", status);
    return `?${params.toString()}`;
  };

  const [upcoming, completedCount, availabilityCount, monthOverview] = await Promise.all([
    prisma.booking.findMany({
      where: { professorId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { student: true },
    }),
    prisma.booking.count({ where: { professorId: user.id, status: "COMPLETED" } }),
    prisma.availability.count({
      where: { professorId: user.id, isActive: true, periodYear: currentPeriod.year, periodMonth: currentPeriod.month },
    }),
    buildPersonMonthOverview({
      role: "PROFESSOR",
      userId: user.id,
      viewerTimezone: user.timezone,
      reference: monthReferenceDate(selectedMonth),
      status: statusFilter,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>

      {user.code && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3 text-sm dark:border-brand-900 dark:bg-brand-950">
          <span className="text-black/70 dark:text-white/70">Your referral code:</span>
          <span className="font-mono text-base font-semibold text-brand-700 dark:text-brand-400">{user.code}</span>
          <span className="text-black/50 dark:text-white/50">
            — share it with anyone applying under &quot;Become a Coach&quot; so we know they came from you.
          </span>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Cooachly Arts doesn&apos;t handle payment — classes auto-confirm, and you arrange your rate directly with each student.
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Upcoming classes</div>
          <div className="mt-1 text-2xl font-bold">{upcoming.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Classes completed</div>
          <div className="mt-1 text-2xl font-bold">{completedCount}</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">This month&apos;s availability windows</div>
          <div className="mt-1 text-2xl font-bold">{availabilityCount}</div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">{monthOverview.monthLabel} — your schedule</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Your booked classes this month, plus your own still-open availability.
        </p>

        <div className="mt-4">
          <MonthNav current={selectedMonth} hrefFor={(ym) => overviewHref({ month: monthParamValue(ym) })} />
        </div>

        <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
          <input type="hidden" name="month" value={monthParamValue(selectedMonth)} />
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
          {statusFilter && (
            <a href={overviewHref({ status: "" })} className="text-sm font-medium text-black/50 hover:underline dark:text-white/50">
              Clear filters
            </a>
          )}
        </form>

        <div className="mt-4">
          <PersonOverviewCalendar month={monthOverview} />
        </div>
      </Card>

      {availabilityCount === 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold">Set your availability</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Students can&apos;t book classes until you add weekly availability windows.
          </p>
          <Link href={sitePath(user.site, "/professor/availability")} className="mt-3 inline-block">
            <Button>Set availability</Button>
          </Link>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold">Next classes</h2>
        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{b.student.name}</div>
                <div className="text-sm text-black/50 dark:text-white/50">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(b.startAt)}
                </div>
              </div>
              <Badge tone={b.status === "CONFIRMED" ? "success" : "default"}>{b.status}</Badge>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-3 text-sm text-black/50 dark:text-white/50">No upcoming classes.</p>}
        </div>
      </Card>
    </div>
  );
}
