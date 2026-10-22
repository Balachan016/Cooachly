import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityRow } from "./availability-row";
import { AvailabilityMonthSwitcher } from "@/components/availability-month-switcher";
import { CopyToNextMonthButton } from "@/components/copy-to-next-month-button";
import { copyAvailabilityToNextMonth } from "@/actions/availability";
import { resolveAvailabilityPeriod, nextAvailabilityPeriod, availabilityPeriodLabel, availabilityPeriodDateRange } from "@/lib/availability-period";
import { formatTime12h } from "@/lib/time-format";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage(props: PageProps<"/professor/availability">) {
  const user = await getCurrentUser();
  if (!user) return null;

  const searchParams = await props.searchParams;
  const periodParam = typeof searchParams.period === "string" ? searchParams.period : undefined;
  const { key: periodKey, period } = resolveAvailabilityPeriod(periodParam, user.timezone);
  const currentPeriod = resolveAvailabilityPeriod("current", user.timezone).period;
  const nextPeriod = nextAvailabilityPeriod(currentPeriod);

  const availabilities = await prisma.availability.findMany({
    where: { professorId: user.id, periodYear: period.year, periodMonth: period.month },
    orderBy: [{ dayOfWeek: "asc" }, { date: "asc" }, { startTime: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Availability</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Set the weekly windows when students can book a session with you, or open a single specific date for a
        one-time window — for one calendar month at a time. Set up next month before it arrives, or copy this
        month&apos;s windows forward if it isn&apos;t changing.
      </p>

      <div className="mt-4">
        <AvailabilityMonthSwitcher
          current={currentPeriod}
          next={nextPeriod}
          active={periodKey}
          hrefFor={(key) => `?period=${key}`}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Add a window for {availabilityPeriodLabel(period)}</h2>
          <AvailabilityForm defaultTimezone={user.timezone} periodKey={periodKey} dateRange={availabilityPeriodDateRange(period)} />
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{availabilityPeriodLabel(period)}&apos;s windows</h2>
            {periodKey === "current" && <CopyToNextMonthButton action={copyAvailabilityToNextMonth} />}
          </div>
          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            {availabilities.map((a) => (
              <AvailabilityRow
                key={a.id}
                id={a.id}
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
    </div>
  );
}
