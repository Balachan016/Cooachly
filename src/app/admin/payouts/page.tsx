import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Card } from "@/components/ui";
import { PayoutForm } from "./payout-form";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function AdminPayoutsPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  if (session.site !== "COOACHLY") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Professor payouts</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Cooachly Arts doesn&apos;t process payment through the platform — gurus arrange and collect their rate
          directly with each student.
        </p>
      </div>
    );
  }

  const [professors, payouts] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PROFESSOR", site: session.site, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.professorPayout.findMany({
      where: { professor: { site: session.site } },
      include: { professor: true },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { paidAt: "desc" }],
      take: 100,
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Professor payouts</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        What was actually paid out to each professor, by month — a manually logged record, not an automatic share
        of revenue.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Record a payout</h2>
        <PayoutForm professors={professors} />
      </Card>

      <Card className="mt-6 p-0">
        <div className="p-4 pb-0">
          <h2 className="font-semibold">History</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="py-2 pr-3">Professor</th>
                <th className="py-2 pr-3">For month</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Paid on</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="py-2 pr-3 font-medium">{p.professor.name}</td>
                  <td className="py-2 pr-3">
                    {MONTHS[p.periodMonth - 1]} {p.periodYear}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {p.currency === "inr" ? "₹" : `${p.currency.toUpperCase()} `}
                    {(p.amountCents / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 pr-3">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(p.paidAt)}</td>
                  <td className="py-2 text-black/60 dark:text-white/60">{p.notes ?? "—"}</td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-black/50 dark:text-white/50">
                    No payouts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
