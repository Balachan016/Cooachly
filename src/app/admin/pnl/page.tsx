import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { sumToInrCents } from "@/lib/exchange-rate";
import { Card } from "@/components/ui";

function formatInr(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminPnlPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  if (session.site !== "COOACHLY") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">P&amp;L</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Cooachly Arts doesn&apos;t process payment or payouts through the platform, so there&apos;s no P&amp;L to
          show here.
        </p>
      </div>
    );
  }

  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: viewerTimezone, year: "numeric", month: "2-digit" }).format(new Date());
  const [year, month] = formatted.split("-").map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEndExclusive = new Date(Date.UTC(year, month, 1));
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthStart);

  // Cash basis: whatever actually moved (paidAt/billedAt) this calendar
  // month counts toward it, regardless of which period a payment, payout,
  // or bill is "for" — a September payout paid in October lands in
  // October's P&L here.
  const [payments, payouts, expenses] = await Promise.all([
    prisma.monthlyPayment.findMany({
      where: { student: { site: session.site }, paidAt: { gte: monthStart, lt: monthEndExclusive } },
    }),
    prisma.professorPayout.findMany({
      where: { professor: { site: session.site }, paidAt: { gte: monthStart, lt: monthEndExclusive } },
    }),
    prisma.subscriptionExpense.findMany({
      where: { billedAt: { gte: monthStart, lt: monthEndExclusive } },
    }),
  ]);

  const [revenue, payoutTotal, expenseTotal] = await Promise.all([
    sumToInrCents(payments),
    sumToInrCents(payouts),
    sumToInrCents(expenses),
  ]);

  const netCents = revenue.totalInrCents - payoutTotal.totalInrCents - expenseTotal.totalInrCents;
  const anyUnconverted = [...revenue.unconvertedCurrencies, ...payoutTotal.unconvertedCurrencies, ...expenseTotal.unconvertedCurrencies];

  return (
    <div>
      <h1 className="text-2xl font-semibold">P&amp;L</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Revenue is this month&apos;s recorded student payments; costs are professor payouts plus subscription
        spend paid out or billed this month — all converted to INR using the rate set under Settings.
      </p>

      {anyUnconverted.length > 0 && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          No exchange rate is set for {Array.from(new Set(anyUnconverted)).join(", ")} — those amounts are excluded
          from the totals below until one is set under Settings → Exchange rate (superadmin).
        </p>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Revenue ({monthLabel})</div>
          <div className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-400">{formatInr(revenue.totalInrCents)}</div>
          <div className="mt-1 text-xs text-black/40 dark:text-white/40">{payments.length} payment{payments.length === 1 ? "" : "s"} recorded</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Professor payouts</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">−{formatInr(payoutTotal.totalInrCents)}</div>
          <div className="mt-1 text-xs text-black/40 dark:text-white/40">{payouts.length} payout{payouts.length === 1 ? "" : "s"} paid this month</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Subscription spend</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">−{formatInr(expenseTotal.totalInrCents)}</div>
          <div className="mt-1 text-xs text-black/40 dark:text-white/40">{expenses.length} charge{expenses.length === 1 ? "" : "s"} billed this month</div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Net for {monthLabel}</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">Revenue minus payouts minus subscriptions</p>
        <div className={`mt-2 text-3xl font-extrabold ${netCents >= 0 ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {netCents < 0 ? "−" : ""}
          {formatInr(Math.abs(netCents))}
        </div>
      </Card>
    </div>
  );
}
