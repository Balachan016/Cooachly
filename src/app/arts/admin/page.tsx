import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Card } from "@/components/ui";
import { TestNotificationButton } from "./test-notification-button";

export default async function AdminOverviewPage() {
  const session = await requireRole("ADMIN");

  const [userCount, professorCount, studentCount, bookingCount] = await Promise.all([
    prisma.user.count({ where: { site: session.site } }),
    prisma.user.count({ where: { role: "PROFESSOR", site: session.site } }),
    prisma.user.count({ where: { role: "STUDENT", site: session.site } }),
    prisma.booking.count({ where: { professor: { site: session.site } } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Overview</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        A snapshot of activity across the platform.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total users" value={userCount} />
        <Stat label="Gurus" value={professorCount} />
        <Stat label="Students" value={studentCount} />
        <Stat label="Total classes" value={bookingCount} />
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Payments</h2>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Cooachly Arts doesn&apos;t process payment on the platform — every class auto-confirms
          at booking, and gurus arrange and collect their rate directly with each student.
        </p>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold">Test notifications</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Sends a test email and WhatsApp message (with a video call join link) to your own account,
          so you can confirm Resend, Twilio, and Daily.co are wired up correctly.
        </p>
        <div className="mt-4">
          <TestNotificationButton />
        </div>
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
