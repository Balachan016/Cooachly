import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card } from "@/components/ui";
import { BulkBookingForm } from "./bulk-booking-form";

export default async function BulkBookingPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";

  const [students, professors] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", isActive: true, site: session.site },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "PROFESSOR", isActive: true, site: session.site },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Bulk booking</h1>
      <p className="mt-1 max-w-3xl text-sm text-black/60 dark:text-white/60">
        Pick a student, a professor, one or more weekly day/time slots, and a date range to create a whole
        month&apos;s (or any range&apos;s) worth of confirmed sessions in one go — e.g. every Monday and Wednesday at
        4pm for all of November. A date that would double-book either person is skipped and listed below instead of
        guessed at. Everyone gets one confirmation email covering every session created, plus a video room each if
        Daily is configured.
      </p>

      <Card className="mt-6">
        <BulkBookingForm students={students} professors={professors} viewerTimezone={viewerTimezone} />
      </Card>

      <a
        href={sitePath(session.site, "/admin/bookings")}
        className="mt-4 inline-block text-sm font-medium text-black/50 hover:underline dark:text-white/50"
      >
        ← Back to bookings
      </a>
    </div>
  );
}
