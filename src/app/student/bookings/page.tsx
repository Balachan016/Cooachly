import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isPastDate } from "@/lib/time";
import { Card } from "@/components/ui";
import { StudentBookingRow } from "./booking-row";

export default async function StudentBookingsPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const bookings = await prisma.booking.findMany({
    where: { studentId: user.id },
    orderBy: { startAt: "desc" },
    include: { professor: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">My bookings</h1>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {bookings.map((b) => (
            <StudentBookingRow key={b.id} booking={b} isPast={isPastDate(b.endAt)} />
          ))}
          {bookings.length === 0 && <p className="p-6 text-sm text-black/50 dark:text-white/50">No bookings yet.</p>}
        </div>
      </Card>
    </div>
  );
}
