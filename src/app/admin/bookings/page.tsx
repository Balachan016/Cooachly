import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";

export default async function AdminBookingsPage() {
  const bookings = await prisma.booking.findMany({
    orderBy: { startAt: "desc" },
    take: 100,
    include: { student: true, professor: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        The most recent 100 sessions booked across the platform.
      </p>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Professor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Price</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="px-4 py-3">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(b.startAt)}
                </td>
                <td className="px-4 py-3">{b.student.name}</td>
                <td className="px-4 py-3">{b.professor.name}</td>
                <td className="px-4 py-3">
                  <Badge tone={b.status === "CANCELLED" ? "danger" : b.status === "COMPLETED" ? "success" : "default"}>
                    {b.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge tone={b.paymentStatus === "UNPAID" ? "warning" : "success"}>{b.paymentStatus}</Badge>
                </td>
                <td className="px-4 py-3">${(b.priceCents / 100).toFixed(2)}</td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No bookings yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
