import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { convertToInrCents } from "@/lib/exchange-rate";
import { Card } from "@/components/ui";
import { ExpenseForm } from "./expense-form";
import { ExpenseRow } from "./expense-row";

export default async function AdminExpensesPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  if (session.site !== "COOACHLY") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Subscription spend</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          This tracks what Cooachly spends on its own infrastructure — there&apos;s nothing site-specific to show
          here for Arts.
        </p>
      </div>
    );
  }

  const canEdit = session.role === "SUPERADMIN";
  const expenses = await prisma.subscriptionExpense.findMany({ orderBy: { billedAt: "desc" }, take: 100 });
  const conversions = await Promise.all(expenses.map((e) => convertToInrCents(e.amountCents, e.currency)));

  let totalInrCents = 0;
  const unconvertedCurrencies = new Set<string>();
  const hasUnconfiguredRate = conversions.some((c, i) => c.inrCents === null && expenses[i].currency !== "inr");
  conversions.forEach((c, i) => {
    if (c.inrCents !== null) totalInrCents += c.inrCents;
    else unconvertedCurrencies.add(expenses[i].currency.toUpperCase());
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Subscription spend</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Log each bill from an external service as it comes in — Vercel, Neon, Twilio, Daily.co, OpenAI, Resend, and
        anything else this project pays for.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Log a charge</h2>
        <ExpenseForm />
      </Card>

      {hasUnconfiguredRate && (
        <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
          No exchange rate is set yet for one or more of these currencies, so those charges below can&apos;t be
          converted. Set one under Settings → Exchange rate (superadmin).
        </p>
      )}

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="font-semibold">History</h2>
          <div className="text-right">
            <div className="text-xs text-black/50 dark:text-white/50">Total (≈ INR)</div>
            <div className="text-lg font-bold">
              ₹{(totalInrCents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {unconvertedCurrencies.size > 0 && (
                <span className="ml-1 text-xs font-normal text-amber-600 dark:text-amber-400">
                  (excludes {Array.from(unconvertedCurrencies).join(", ")})
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="py-2 pr-3">Service</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3 text-right">≈ INR</th>
                <th className="py-2 pr-3">Billed on</th>
                <th className="py-2">Notes</th>
                {canEdit && <th className="py-2 pl-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <ExpenseRow key={e.id} expense={e} inrCents={conversions[i].inrCents} canEdit={canEdit} />
              ))}
              {expenses.length === 0 && (
                <tr>
                  <td colSpan={canEdit ? 6 : 5} className="py-6 text-center text-black/50 dark:text-white/50">
                    No charges logged yet.
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
