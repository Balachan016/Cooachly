import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card, Select } from "@/components/ui";
import { AdminBookingRow } from "./booking-row";

export default async function AdminBookingsPage(props: PageProps<"/arts/admin/bookings">) {
  const session = await requireRole("ADMIN");
  const searchParams = await props.searchParams;
  const studentId = typeof searchParams.student === "string" ? searchParams.student : "";
  const date = typeof searchParams.date === "string" ? searchParams.date : "";

  const where: Prisma.BookingWhereInput = {
    professor: { site: session.site },
    ...(studentId ? { studentId } : {}),
    ...(date ? { startAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } } : {}),
  };

  const [bookings, students] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startAt: "desc" },
      take: 100,
      include: {
        student: true,
        professor: true,
        attachments: true,
        notificationLogs: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", site: session.site, bookingsAsStudent: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hasFilters = Boolean(studentId || date);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        {hasFilters ? "Classes matching your filters." : "The most recent 100 classes booked across the platform."} Cooachly Arts doesn&apos;t collect payment — gurus and students arrange rates directly.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-56">
          <label htmlFor="student" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
            Student
          </label>
          <Select id="student" name="student" defaultValue={studentId}>
            <option value="">All students</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <label htmlFor="date" className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
            Date
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={date}
            className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 dark:border-white/15 dark:bg-neutral-800"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Filter
        </button>
        {hasFilters && (
          <a
            href={sitePath(session.site, "/admin/bookings")}
            className="text-sm font-medium text-black/50 hover:underline dark:text-white/50"
          >
            Clear filters
          </a>
        )}
      </form>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Guru</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Video</th>
              <th className="px-4 py-3">Extend</th>
              <th className="px-4 py-3">Files</th>
              <th className="px-4 py-3">Reminders</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <AdminBookingRow key={b.id} booking={b} />
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  {hasFilters ? "No classes match your filters." : "No bookings yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
