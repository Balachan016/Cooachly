import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";
import { AvailabilityForm } from "./availability-form";
import { AvailabilityRow } from "./availability-row";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const availabilities = await prisma.availability.findMany({
    where: { professorId: user.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Availability</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Set the weekly windows when students can book a 1-hour session with you. Times repeat every week.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold">Add a weekly window</h2>
          <AvailabilityForm defaultTimezone={user.timezone} />
        </Card>

        <Card>
          <h2 className="font-semibold">Your windows</h2>
          <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
            {availabilities.map((a) => (
              <AvailabilityRow
                key={a.id}
                id={a.id}
                label={`${DAY_NAMES[a.dayOfWeek]} ${a.startTime}–${a.endTime}`}
                timezone={a.timezone}
                sessionLengthMinutes={a.sessionLengthMinutes}
              />
            ))}
            {availabilities.length === 0 && (
              <p className="py-3 text-sm text-black/50 dark:text-white/50">No availability windows yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
