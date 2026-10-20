import "server-only";
import { prisma } from "@/lib/prisma";

/** Null if no rate has been set yet for this currency pair (see Settings → Exchange rate). */
export async function getExchangeRate(from: string, to: string): Promise<number | null> {
  if (from.toLowerCase() === to.toLowerCase()) return 1;
  const row = await prisma.exchangeRate.findUnique({
    where: { fromCurrency_toCurrency: { fromCurrency: from.toLowerCase(), toCurrency: to.toLowerCase() } },
  });
  return row?.rate ?? null;
}

export async function convertToInrCents(amountCents: number, currency: string): Promise<{ inrCents: number | null; rate: number | null }> {
  const cur = currency.toLowerCase();
  if (cur === "inr") return { inrCents: amountCents, rate: 1 };
  const rate = await getExchangeRate(cur, "inr");
  if (rate === null) return { inrCents: null, rate: null };
  return { inrCents: Math.round(amountCents * rate), rate };
}

/**
 * Sums a mixed-currency list of {amountCents, currency} rows into INR,
 * looking up each distinct non-INR currency's rate once. A currency with no
 * rate set yet is excluded from the total and named in unconvertedCurrencies
 * instead of being silently dropped or guessed at.
 */
export async function sumToInrCents(rows: { amountCents: number; currency: string }[]): Promise<{ totalInrCents: number; unconvertedCurrencies: string[] }> {
  const distinctCurrencies = Array.from(new Set(rows.map((r) => r.currency.toLowerCase()).filter((c) => c !== "inr")));
  const rates = new Map<string, number | null>();
  for (const currency of distinctCurrencies) rates.set(currency, await getExchangeRate(currency, "inr"));

  let totalInrCents = 0;
  const unconverted = new Set<string>();
  for (const row of rows) {
    const currency = row.currency.toLowerCase();
    if (currency === "inr") {
      totalInrCents += row.amountCents;
      continue;
    }
    const rate = rates.get(currency);
    if (rate == null) {
      unconverted.add(currency.toUpperCase());
      continue;
    }
    totalInrCents += Math.round(row.amountCents * rate);
  }
  return { totalInrCents, unconvertedCurrencies: Array.from(unconverted) };
}
