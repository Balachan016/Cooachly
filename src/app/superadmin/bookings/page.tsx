import { prisma } from "@/lib/prisma";
import { Card, Select } from "@/components/ui";
import { SuperadminBookingRow } from "./booking-row";
import type { BookingStatus } from "@prisma/client";

const BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"];

export default async function SuperadminBookingsPage(props: PageProps<"/superadmin/bookings">) {
  const searchParams = await props.searchParams;
  const site = typeof searchParams.site === "string" ? searchParams.site : "";
  const rawStatus = typeof searchParams.status === "string" ? searchParams.status : "";
  const status = BOOKING_STATUSES.find((s) => s === rawStatus);

  const bookings = await prisma.booking.findMany({
    where: {
      ...(site === "COOACHLY" || site === "ARTS" ? { professor: { site } } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { startAt: "asc" },
    take: 300,
    include: { student: true, professor: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Every session across both sites, including cancellations. Most recent 300 shown.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Site</label>
          <Select name="site" defaultValue={site}>
            <option value="">All sites</option>
            <option value="COOACHLY">Cooachly</option>
            <option value="ARTS">Arts</option>
          </Select>
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Status</label>
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Filter
        </button>
        {(site || status) && (
          <a href="/superadmin/bookings" className="text-sm font-medium text-black/50 hover:underline dark:text-white/50">
            Clear filters
          </a>
        )}
      </form>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Professor</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <SuperadminBookingRow key={b.id} booking={b} />
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No sessions match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
