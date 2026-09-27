import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Pricing — Cooachly",
};

export default function PricingPage() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo withTagline />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Home
          </Link>
          <Link href="/faq" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            FAQ
          </Link>
          <Link href="/contact" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Contact
          </Link>
          <Link href="/become-a-coach" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Become a coach
          </Link>
          <Link href="/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-4xl">
          Pricing, made personal
        </h1>
        <p className="mt-3 max-w-2xl text-black/60 dark:text-white/60">
          Your first session is always a free demo — no payment, no commitment. Once you&apos;ve
          met your coach, we&apos;ll share a plan and price tailored to your subject and schedule.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="relative border-brand-600">
            <span className="absolute -top-3 left-6 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white">
              Standard plan
            </span>
            <p className="mt-2 text-2xl font-bold text-brand-900 dark:text-brand-300">
              Shared after your free demo
            </p>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">
              We tailor pricing to your subject, schedule, and coach — your coach will walk you
              through it right after your demo session.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-black/70 dark:text-white/70">
              <li>• 8 sessions per month (2 sessions per week)</li>
              <li>• ~45-minute sessions — extendable up to 1 hour if needed</li>
              <li>• Weekend and evening scheduling, in your own timezone</li>
              <li>• Reminders by email and WhatsApp before every session</li>
              <li>• Messaging with your coach between sessions</li>
            </ul>
            <Link href="/demo" className="mt-6 block">
              <Button className="w-full">Book your free demo</Button>
            </Link>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-900 dark:text-brand-300">Good to know</h2>
            <ul className="mt-4 space-y-3 text-sm text-black/70 dark:text-white/70">
              <li>
                <strong>Weekday sessions:</strong> once the school year is in session, weekday slots
                can be more limited and may cost a little more than weekend sessions — your coach
                will confirm exact pricing with you. Weekend scheduling remains the most economical
                option.
              </li>
              <li>
                <strong>Individual coach rates:</strong> Cooachly is a marketplace — coaches set
                their own per-session or monthly rate, shared with you before you commit.
              </li>
              <li>
                <strong>Referral discounts:</strong> refer friends and save on your own plan — see
                our <Link href="/faq#referrals" className="font-medium text-brand-700 hover:underline dark:text-brand-400">FAQ</Link> for details.
              </li>
              <li>
                <strong>Payments:</strong> handled securely through Stripe, billed monthly or per
                session — no manual transfers required.
              </li>
            </ul>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <p className="text-black/60 dark:text-white/60">Questions about pricing or plans?</p>
          <Link href="/contact" className="mt-2 inline-block font-medium text-brand-700 hover:underline dark:text-brand-400">
            Get in touch →
          </Link>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-black/40 dark:text-white/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Cooachly</span>
          <span>For enquiries: +91 80151 51896</span>
        </div>
      </footer>
    </div>
  );
}
