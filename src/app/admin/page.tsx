import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export default async function AdminOverviewPage() {
  const [userCount, professorCount, studentCount, bookingCount, paidBookings] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "PROFESSOR" } }),
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.booking.count(),
    prisma.booking.findMany({
      where: { paymentStatus: "PAID" },
      select: { priceCents: true },
    }),
  ]);

  const revenueCents = paidBookings.reduce((sum, b) => sum + b.priceCents, 0);

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
        <h2 className="font-semibold">Revenue collected</h2>
        <p className="mt-2 text-3xl font-bold">${(revenueCents / 100).toFixed(2)}</p>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">From {paidBookings.length} paid bookings</p>
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
