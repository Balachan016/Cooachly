import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured } from "@/lib/stripe";
import { sitePath } from "@/lib/site";
import { Badge, Button, Card } from "@/components/ui";

export default async function ProfessorDashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [upcoming, earnings, availabilityCount] = await Promise.all([
    prisma.booking.findMany({
      where: { professorId: user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { student: true },
    }),
    prisma.booking.aggregate({
      where: { professorId: user.id, paymentStatus: { in: ["PAID", "COVERED_BY_SUBSCRIPTION"] } },
      _sum: { priceCents: true },
    }),
    prisma.availability.count({ where: { professorId: user.id, isActive: true } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome back, {user.name.split(" ")[0]}</h1>

      {!isStripeConfigured && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Stripe isn&apos;t configured yet — sessions are auto-confirmed without collecting payment. Add your Stripe keys to enable billing.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Upcoming sessions</div>
          <div className="mt-1 text-2xl font-bold">{upcoming.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Total earnings</div>
          <div className="mt-1 text-2xl font-bold">${((earnings._sum.priceCents ?? 0) / 100).toFixed(2)}</div>
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
            Students can&apos;t book sessions until you add weekly availability windows.
          </p>
          <Link href={sitePath(user.site, "/professor/availability")} className="mt-3 inline-block">
            <Button>Set availability</Button>
          </Link>
        </Card>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold">Next sessions</h2>
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
          {upcoming.length === 0 && <p className="py-3 text-sm text-black/50 dark:text-white/50">No upcoming sessions.</p>}
        </div>
      </Card>
    </div>
  );
}
