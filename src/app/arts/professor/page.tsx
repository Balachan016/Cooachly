import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { sitePath } from "@/lib/site";
import { Badge, Button, Card } from "@/components/ui";

export default async function ProfessorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [upcoming, completedCount, availabilityCount] = await Promise.all([
    prisma.booking.findMany({
      where: { professorId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { student: true },
    }),
    prisma.booking.count({ where: { professorId: user.id, status: "COMPLETED" } }),
    prisma.availability.count({ where: { professorId: user.id, isActive: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>

      <div className="mt-4 rounded-lg border border-black/10 bg-black/5 px-4 py-3 text-sm text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
        Cooachly Arts doesn&apos;t handle payment — classes auto-confirm, and you arrange your rate directly with each student.
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Upcoming classes</div>
          <div className="mt-1 text-2xl font-bold">{upcoming.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Classes completed</div>
          <div className="mt-1 text-2xl font-bold">{completedCount}</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Weekly availability windows</div>
          <div className="mt-1 text-2xl font-bold">{availabilityCount}</div>
        </Card>
      </div>

      {availabilityCount === 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold">Set your availability</h2>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Students can&apos;t book classes until you add weekly availability windows.
          </p>
          <Link href={sitePath(user.site, "/professor/availability")} className="mt-3 inline-block">
            <Button>Set availability</Button>
          </Link>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold">Next classes</h2>
        <div className="mt-4 divide-y divide-black/5 dark:divide-white/5">
          {upcoming.map((b) => (
            <div key={b.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{b.student.name}</div>
                <div className="text-sm text-black/50 dark:text-white/50">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(b.startAt)}
                </div>
              </div>
              <Badge tone={b.status === "CONFIRMED" ? "success" : "default"}>{b.status}</Badge>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-3 text-sm text-black/50 dark:text-white/50">No upcoming classes.</p>}
        </div>
      </Card>
    </div>
  );
}
