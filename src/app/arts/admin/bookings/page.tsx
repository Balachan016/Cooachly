import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { bookingStatusFilter, getLiveCallStatus } from "@/lib/bookings";
import { Badge, Card, Select } from "@/components/ui";
import { AdminBookingRow } from "./booking-row";

export default async function AdminBookingsPage(props: PageProps<"/arts/admin/bookings">) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";
  const searchParams = await props.searchParams;
  const studentId = typeof searchParams.student === "string" ? searchParams.student : "";
  const date = typeof searchParams.date === "string" ? searchParams.date : "";
  const view =
    searchParams.view === "completed"
      ? "completed"
      : searchParams.view === "cancelled"
        ? "cancelled"
        : searchParams.view === "reschedules"
          ? "reschedules"
          : "upcoming";

  const where: Prisma.BookingWhereInput = {
    professor: { site: session.site },
    ...bookingStatusFilter(view),
    ...(studentId ? { studentId } : {}),
    ...(date ? { startAt: { gte: new Date(`${date}T00:00:00.000Z`), lt: new Date(`${date}T23:59:59.999Z`) } } : {}),
  };

  const now = new Date();
  const [bookings, liveBookings, students] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: view === "upcoming" ? { startAt: "asc" } : view === "reschedules" ? { updatedAt: "desc" } : { startAt: "desc" },
      take: 300,
      include: {
        student: true,
        professor: true,
        attachments: true,
        notificationLogs: { orderBy: { createdAt: "desc" } },
        callAttendanceEvents: true,
      },
    }),
    // Independent of the tab/filters above — an admin should see every
    // class happening right now regardless of what view they're looking at.
    prisma.booking.findMany({
      where: {
        professor: { site: session.site },
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { lte: now },
        endAt: { gte: now },
      },
      orderBy: { startAt: "asc" },
      include: { student: true, professor: true, callAttendanceEvents: true },
    }),
    prisma.user.findMany({
      where: { role: "STUDENT", site: session.site, bookingsAsStudent: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const hasFilters = Boolean(studentId || date);
  const tabQuery = (tabView: "upcoming" | "completed" | "cancelled" | "reschedules") => {
    const params = new URLSearchParams();
    if (studentId) params.set("student", studentId);
    if (date) params.set("date", date);
    if (tabView !== "upcoming") params.set("view", tabView);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };
  const exportHref = (() => {
    const params = new URLSearchParams();
    if (studentId) params.set("student", studentId);
    if (date) params.set("date", date);
    if (view !== "upcoming") params.set("view", view);
    const qs = params.toString();
    return `/api/admin/export/bookings${qs ? `?${qs}` : ""}`;
  })();

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {hasFilters
              ? "Classes matching your filters."
              : view === "completed"
                ? "Up to 300 completed classes, most recent first."
                : view === "cancelled"
                  ? "Up to 300 cancelled classes, most recent first."
                  : view === "reschedules"
                    ? "Every class with a pending reschedule proposal or past reschedule, most recent activity first."
                    : "Up to 300 upcoming classes, soonest first."}{" "}
            Cooachly Arts doesn&apos;t collect payment — gurus and students arrange rates directly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={exportHref}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Export CSV
          </a>
          <a
            href={sitePath(session.site, "/admin/bookings/import")}
            className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Import schedule
          </a>
        </div>
      </div>

      <div className="mt-4 flex gap-1 border-b border-black/10 dark:border-white/10">
        {(["upcoming", "completed", "cancelled", "reschedules"] as const).map((tabView) => (
          <a
            key={tabView}
            href={`${sitePath(session.site, "/admin/bookings")}${tabQuery(tabView)}`}
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

      <Card className="mt-6">
        <h2 className="font-semibold">Live now</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Every class whose scheduled window is open right now, and who&apos;s actually joined — derived from Daily&apos;s
          join/leave events, so refresh the page for the latest. If nobody&apos;s joined after a couple of minutes, a
          voice-note nudge goes out automatically (see a class&apos;s Details for the reminder log).
        </p>
        {liveBookings.length === 0 ? (
          <p className="mt-3 text-sm text-black/40 dark:text-white/40">No classes in progress right now.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {liveBookings.map((b) => {
              const status = getLiveCallStatus(b, b.callAttendanceEvents);
              if (!status) return null;
              return (
                <div key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">
                    {b.student.name} ↔ {b.professor.name}
                  </span>
                  {status.kind === "live_both" && <Badge tone="success">Live — both joined</Badge>}
                  {status.kind === "live_waiting" && (
                    <Badge tone="warning">Live — waiting on {status.missing === "STUDENT" ? "student" : "guru"}</Badge>
                  )}
                  {status.kind === "nobody_joined" && (
                    <Badge tone="danger">Nobody joined yet ({status.minutesSinceStart}m)</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        {view !== "upcoming" && <input type="hidden" name="view" value={view} />}
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
            href={`${sitePath(session.site, "/admin/bookings")}${tabQuery(view)}`}
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
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Student</th>
              <th className="px-4 py-2">Guru</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Details</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <AdminBookingRow key={b.id} booking={b} viewerRole={session.role} viewerTimezone={viewerTimezone} />
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  {hasFilters
                    ? "No classes match your filters."
                    : view === "completed"
                      ? "No completed classes yet."
                      : view === "cancelled"
                        ? "No cancelled classes."
                        : view === "reschedules"
                          ? "No reschedule activity to review."
                          : "No upcoming bookings."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
