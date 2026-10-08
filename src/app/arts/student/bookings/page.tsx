import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isPastDate, isWithinJoinWindow } from "@/lib/time";
import { bookingStatusFilter } from "@/lib/bookings";
import { Card } from "@/components/ui";
import { StudentBookingRow } from "./booking-row";

export default async function StudentBookingsPage(props: PageProps<"/arts/student/bookings">) {
  const user = await getCurrentUser();
  if (!user) return null;

  const searchParams = await props.searchParams;
  const view = searchParams.view === "completed" ? "completed" : "upcoming";

  const bookings = await prisma.booking.findMany({
    where: { studentId: user.id, ...bookingStatusFilter(view) },
    orderBy: { startAt: view === "completed" ? "desc" : "asc" },
    include: { professor: true, attachments: true, reviews: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">My bookings</h1>

      <div className="mt-4 flex gap-1 border-b border-black/10 dark:border-white/10">
        {(["upcoming", "completed"] as const).map((tabView) => (
          <a
            key={tabView}
            href={tabView === "upcoming" ? "?" : `?view=${tabView}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              view === tabView
                ? "border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
            }`}
          >
            {tabView}
          </a>
        ))}
      </div>

      <Card className="mt-4 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {bookings.map((b) => (
            <StudentBookingRow
              key={b.id}
              booking={b}
              isPast={isPastDate(b.endAt)}
              canJoin={isWithinJoinWindow(b.startAt, b.endAt)}
            />
          ))}
          {bookings.length === 0 && (
            <p className="p-6 text-sm text-black/50 dark:text-white/50">
              {view === "completed" ? "No completed sessions yet." : "No upcoming bookings."}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
