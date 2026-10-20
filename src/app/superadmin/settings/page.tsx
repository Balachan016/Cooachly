import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Card } from "@/components/ui";
import { ExchangeRateForm } from "./exchange-rate-form";

export default async function SuperadminSettingsPage() {
  await requireRole("SUPERADMIN");

  const usdToInr = await prisma.exchangeRate.findUnique({ where: { fromCurrency_toCurrency: { fromCurrency: "usd", toCurrency: "inr" } } });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">Platform-wide settings that apply across both sites.</p>

      <Card className="mt-6">
        <h2 className="font-semibold">Currency conversion</h2>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          A fixed rate you set manually — no external exchange-rate API is used. Every USD amount on the admin
          Expenses and P&amp;L pages converts to INR using whatever&apos;s set here, until you update it again.
        </p>
        <ExchangeRateForm fromCurrency="usd" toCurrency="inr" rate={usdToInr?.rate ?? null} />
        {usdToInr && (
          <p className="mt-3 text-xs text-black/40 dark:text-white/40">
            Last updated {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(usdToInr.updatedAt)}.
          </p>
        )}
      </Card>
    </div>
  );
}
