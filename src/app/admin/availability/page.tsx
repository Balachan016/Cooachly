import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Card, Select } from "@/components/ui";
import { AdminAvailabilityForm } from "./admin-availability-form";
import { AdminAvailabilityRow } from "./admin-availability-row";
import { AvailabilityMonthSwitcher } from "@/components/availability-month-switcher";
import { CopyToNextMonthButton } from "@/components/copy-to-next-month-button";
import { adminCopyAvailabilityToNextMonth } from "@/actions/admin-availability";
import { resolveAvailabilityPeriod, nextAvailabilityPeriod, availabilityPeriodLabel, availabilityPeriodDateRange } from "@/lib/availability-period";
import { formatTime12h } from "@/lib/time-format";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AdminAvailabilityPage(props: PageProps<"/admin/availability">) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  const searchParams = await props.searchParams;
  const professorId = typeof searchParams.professor === "string" ? searchParams.professor : "";
  const periodParam = typeof searchParams.period === "string" ? searchParams.period : undefined;

  const professors = await prisma.user.findMany({
    where: { role: "PROFESSOR", isActive: true, site: session.site },
    select: { id: true, name: true, timezone: true },
    orderBy: { name: "asc" },
  });

  const selected = professorId ? professors.find((p) => p.id === professorId) : undefined;

  const { key: periodKey, period } = selected
    ? resolveAvailabilityPeriod(periodParam, selected.timezone)
    : { key: "current" as const, period: { year: 0, month: 0 } };
  const currentPeriod = selected ? resolveAvailabilityPeriod("current", selected.timezone).period : { year: 0, month: 0 };
  const nextPeriod = nextAvailabilityPeriod(currentPeriod);

  const availabilities = selected
    ? await prisma.availability.findMany({
        where: { professorId: selected.id, periodYear: period.year, periodMonth: period.month },
        orderBy: [{ dayOfWeek: "asc" }, { date: "asc" }, { startTime: "asc" }],
      })
    : [];

  return (
    <div>
      <h1 className="text-2xl font-semibold">Professor availability</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Set or remove a professor&apos;s weekly availability windows on their behalf — the same windows they&apos;d
        set for themselves under their own Availability page, and the ones students book against. Windows are set
        one calendar month at a time.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-64">
          <label htmlFor="professor" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
            Professor
          </label>
          <Select id="professor" name="professor" defaultValue={professorId}>
            <option value="">Select a professor</option>
            {professors.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
          View
        </button>
      </form>

      {selected && (
        <>
          <div className="mt-4">
            <AvailabilityMonthSwitcher
              current={currentPeriod}
              next={nextPeriod}
              active={periodKey}
              hrefFor={(key) => `?professor=${selected.id}&period=${key}`}
            />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="font-semibold">
                Add a window for {selected.name} — {availabilityPeriodLabel(period)}
              </h2>
              <AdminAvailabilityForm
                professorId={selected.id}
                defaultTimezone={selected.timezone}
                periodKey={periodKey}
                dateRange={availabilityPeriodDateRange(period)}
              />
            </Card>

            <Card>
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">
                  {selected.name}&apos;s windows — {availabilityPeriodLabel(period)}
                </h2>
                {periodKey === "current" && (
                  <CopyToNextMonthButton action={adminCopyAvailabilityToNextMonth.bind(null, selected.id)} />
                )}
              </div>
              <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
                {availabilities.map((a) => (
                  <AdminAvailabilityRow
                    key={a.id}
                    id={a.id}
                    professorId={selected.id}
                    label={
                      a.date
                        ? `One-time: ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(a.date)} ${formatTime12h(a.startTime)}–${formatTime12h(a.endTime)}`
                        : `${DAY_NAMES[a.dayOfWeek!]} ${formatTime12h(a.startTime)}–${formatTime12h(a.endTime)}`
                    }
                    timezone={a.timezone}
                    sessionLengthMinutes={a.sessionLengthMinutes}
                  />
                ))}
                {availabilities.length === 0 && (
                  <p className="py-3 text-sm text-black/50 dark:text-white/50">
                    No availability windows for {availabilityPeriodLabel(period)} yet.
                  </p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
