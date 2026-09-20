import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";

export const metadata = {
  title: "Pricing — Cooachly Arts",
};

export default function PricingPage() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/arts">
          <ArtsLogo withTagline />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/arts" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Home
          </Link>
          <Link href="/arts/faq" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            FAQ
          </Link>
          <Link href="/arts/contact" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Contact
          </Link>
          <Link href="/arts/become-a-coach" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Become a guru
          </Link>
          <Link href="/arts/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
          <Link href="/arts/register">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-4xl">
          Simple, straightforward pricing
        </h1>
        <p className="mt-3 max-w-2xl text-black/60 dark:text-white/60">
          One standard monthly plan covers everything — no hidden fees. Your first class is
          always a free demo, so you can meet your guru before you commit.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="relative border-brand-600">
            <span className="absolute -top-3 left-6 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white">
              Standard plan
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-bold text-brand-900 dark:text-brand-300">$120</span>
              <span className="text-black/50 dark:text-white/50">/ month</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-black/70 dark:text-white/70">
              <li>• 8 classes per month (2 classes per week)</li>
              <li>• ~45-minute classes — extendable up to 1 hour if needed</li>
              <li>• Weekend and evening scheduling, in your own timezone</li>
              <li>• Reminders by email and WhatsApp before every class</li>
              <li>• Messaging with your guru between classes</li>
            </ul>
            <Link href="/arts/demo" className="mt-6 block">
              <Button className="w-full">Book your free demo</Button>
            </Link>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-900 dark:text-brand-300">Good to know</h2>
            <ul className="mt-4 space-y-3 text-sm text-black/70 dark:text-white/70">
              <li>
                <strong>Weekday classes:</strong> once the school year is in session, weekday slots
                can be more limited and may carry a small premium over the standard weekend rate.
                Weekend scheduling remains the most economical option.
              </li>
              <li>
                <strong>Individual guru rates:</strong> Cooachly Arts is a marketplace — some gurus set
                their own per-class or monthly rate, shown on their profile before you book.
              </li>
              <li>
                <strong>Referral discounts:</strong> refer friends and save on your own plan — see
                our <Link href="/arts/faq#referrals" className="font-medium text-brand-700 hover:underline dark:text-brand-400">FAQ</Link> for details.
              </li>
              <li>
                <strong>Payments:</strong> handled securely through Stripe, billed monthly or per
                class — no manual transfers required.
              </li>
            </ul>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-black/60 dark:text-white/60">Questions about pricing or plans?</p>
          <Link href="/arts/contact" className="mt-2 inline-block font-medium text-brand-700 hover:underline dark:text-brand-400">
            Get in touch →
          </Link>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-black/40 dark:text-white/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Cooachly Arts</span>
          <span>For enquiries: +91 80151 51896</span>
        </div>
      </footer>
    </div>
  );
}
