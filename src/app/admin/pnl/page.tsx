import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { sumToInrCents } from "@/lib/exchange-rate";
import { Card } from "@/components/ui";
import { currentFiscalYearLabel, fiscalYearRange, fiscalYearLabel, type FiscalScope } from "@/lib/fiscal-year";

function formatInr(cents: number): string {
  return `₹${(cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AdminPnlPage(props: PageProps<"/admin/pnl">) {
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

  // Fiscal-year rollup, alongside (not replacing) the calendar-month view
  // above — same cash-basis figures, just totaled over a whole year at a
  // time, using whichever of India's (Apr–Mar) or the USA's (Jan–Dec)
  // fiscal year the admin is looking at.
  const searchParams = await props.searchParams;
  const fyScope: FiscalScope = searchParams.fyScope === "usa" ? "usa" : "india";
  const fyYearParam = typeof searchParams.fyYear === "string" ? Number(searchParams.fyYear) : NaN;
  const fyYear = Number.isInteger(fyYearParam) ? fyYearParam : currentFiscalYearLabel(fyScope, viewerTimezone);
  const { start: fyStart, end: fyEnd } = fiscalYearRange(fyScope, fyYear);

  const [fyPayments, fyPayouts, fyExpenses] = await Promise.all([
    prisma.monthlyPayment.findMany({ where: { student: { site: session.site }, paidAt: { gte: fyStart, lt: fyEnd } } }),
    prisma.professorPayout.findMany({ where: { professor: { site: session.site }, paidAt: { gte: fyStart, lt: fyEnd } } }),
    prisma.subscriptionExpense.findMany({ where: { billedAt: { gte: fyStart, lt: fyEnd } } }),
  ]);
  const [fyRevenue, fyPayoutTotal, fyExpenseTotal] = await Promise.all([
    sumToInrCents(fyPayments),
    sumToInrCents(fyPayouts),
    sumToInrCents(fyExpenses),
  ]);
  const fyNetCents = fyRevenue.totalInrCents - fyPayoutTotal.totalInrCents - fyExpenseTotal.totalInrCents;
  const fyAnyUnconverted = [...fyRevenue.unconvertedCurrencies, ...fyPayoutTotal.unconvertedCurrencies, ...fyExpenseTotal.unconvertedCurrencies];

  const scopeHref = (scope: FiscalScope) => `?fyScope=${scope}&fyYear=${currentFiscalYearLabel(scope, viewerTimezone)}`;
  const yearHref = (deltaYears: number) => `?fyScope=${fyScope}&fyYear=${fyYear + deltaYears}`;

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

      <h2 className="mt-10 text-lg font-semibold">Fiscal year</h2>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        The same cash-basis figures as above, totaled over a full fiscal year — India&apos;s (April–March) or the
        USA&apos;s (January–December).
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-black/10 p-1 dark:border-white/10">
          {(["india", "usa"] as const).map((scope) => (
            <Link
              key={scope}
              href={scopeHref(scope)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                fyScope === scope
                  ? "bg-brand-700 text-white"
                  : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"
              }`}
            >
              {scope === "india" ? "India (Apr–Mar)" : "USA (Jan–Dec)"}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href={yearHref(-1)} className="rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Previous fiscal year">
            ←
          </Link>
          <span>{fiscalYearLabel(fyScope, fyYear)}</span>
          <Link href={yearHref(1)} className="rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10" aria-label="Next fiscal year">
            →
          </Link>
        </div>
      </div>

      {fyAnyUnconverted.length > 0 && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          No exchange rate is set for {Array.from(new Set(fyAnyUnconverted)).join(", ")} — those amounts are excluded
          from the totals below until one is set under Settings → Exchange rate (superadmin).
        </p>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Revenue</div>
          <div className="mt-1 text-2xl font-bold text-brand-700 dark:text-brand-400">{formatInr(fyRevenue.totalInrCents)}</div>
          <div className="mt-1 text-xs text-black/40 dark:text-white/40">{fyPayments.length} payment{fyPayments.length === 1 ? "" : "s"} recorded</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Professor payouts</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">−{formatInr(fyPayoutTotal.totalInrCents)}</div>
          <div className="mt-1 text-xs text-black/40 dark:text-white/40">{fyPayouts.length} payout{fyPayouts.length === 1 ? "" : "s"} paid</div>
        </Card>
        <Card>
          <div className="text-sm text-black/50 dark:text-white/50">Subscription spend</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">−{formatInr(fyExpenseTotal.totalInrCents)}</div>
          <div className="mt-1 text-xs text-black/40 dark:text-white/40">{fyExpenses.length} charge{fyExpenses.length === 1 ? "" : "s"} billed</div>
        </Card>
      </div>

      <Card className="mt-4">
        <h3 className="font-semibold">Net for {fiscalYearLabel(fyScope, fyYear)}</h3>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">Revenue minus payouts minus subscriptions</p>
        <div className={`mt-2 text-3xl font-extrabold ${fyNetCents >= 0 ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {fyNetCents < 0 ? "−" : ""}
          {formatInr(Math.abs(fyNetCents))}
        </div>
      </Card>
    </div>
  );
}
