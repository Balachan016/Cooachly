import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { Badge, Button, Card } from "@/components/ui";
import { ContactInfoForm } from "@/components/contact-info-form";

export default async function StudentDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const upcoming = await prisma.booking.findMany({
    where: { studentId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: new Date() } },
    orderBy: { startAt: "asc" },
    take: 5,
    include: { professor: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Times shown in your timezone: {user.timezone}.
      </p>

      <Card className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Upcoming sessions</h2>
          <Link href="/student/professors">
            <Button variant="secondary">Book a session</Button>
          </Link>
        </div>
        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{b.professor.name}</div>
                <div className="text-sm text-black/50 dark:text-white/50">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(b.startAt)}
                </div>
              </div>
              <Badge tone={b.status === "CONFIRMED" ? "success" : "default"}>{b.status}</Badge>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-3 text-sm text-black/50 dark:text-white/50">No upcoming sessions yet.</p>}
        </div>
      </Card>

      <h2 className="mt-8 text-lg font-semibold">Contact info</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Add your phone number to get session reminders by SMS/WhatsApp in addition to email.
      </p>
      <Card className="mt-4 max-w-xl">
        <ContactInfoForm timezone={user.timezone} phone={user.phone} />
      </Card>
    </div>
  );
}
