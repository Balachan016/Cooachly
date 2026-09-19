import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isPastDate, isWithinJoinWindow } from "@/lib/time";
import { Card } from "@/components/ui";
import { ProfessorBookingRow } from "./booking-row";

export default async function ProfessorBookingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const bookings = await prisma.booking.findMany({
    where: { professorId: user.id },
    orderBy: { startAt: "desc" },
    include: { student: { include: { studentProfile: true } }, attachments: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Add a video call link for each session and mark sessions complete once they&apos;re done.
      </p>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {bookings.map((b) => (
            <ProfessorBookingRow
              key={b.id}
              booking={b}
              isPast={isPastDate(b.endAt)}
              canJoin={isWithinJoinWindow(b.startAt, b.endAt)}
            />
          ))}
          {bookings.length === 0 && (
            <p className="p-6 text-sm text-black/50 dark:text-white/50">No bookings yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
