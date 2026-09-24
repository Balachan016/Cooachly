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
          Pricing is between you and your guru
        </h1>
        <p className="mt-3 max-w-2xl text-black/60 dark:text-white/60">
          Cooachly Arts doesn&apos;t charge for classes or take a cut — we just handle scheduling,
          reminders, video calls, and messaging. You and your guru agree on a rate directly, the
          same way you would with a private teacher.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <Card className="relative border-brand-600">
            <span className="absolute -top-3 left-6 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white">
              What Cooachly Arts provides
            </span>
            <ul className="mt-4 space-y-2 text-sm text-black/70 dark:text-white/70">
              <li>• Fixed 30-minute classes, booked in your own timezone</li>
              <li>• Your first class is always a free demo</li>
              <li>• Reminders by email and WhatsApp before every class</li>
              <li>• A video room for every confirmed booking — no separate app or link</li>
              <li>• Messaging with your guru between classes</li>
              <li>• No booking fee, no subscription, no platform cut</li>
            </ul>
            <Link href="/arts/demo" className="mt-6 block">
              <Button className="w-full">Book your free demo</Button>
            </Link>
          </Card>

          <Card>
            <h2 className="font-semibold text-brand-900 dark:text-brand-300">Good to know</h2>
            <ul className="mt-4 space-y-3 text-sm text-black/70 dark:text-white/70">
              <li>
                <strong>How rates work:</strong> every guru sets their own rate and shares it with
                you directly — usually on their profile bio or the first time you message them.
                It varies guru to guru and can vary student to student.
              </li>
              <li>
                <strong>Booking is free either way:</strong> classes auto-confirm the moment you
                pick a slot — there&apos;s no payment step in Cooachly Arts itself.
              </li>
              <li>
                <strong>How you pay your guru:</strong> that&apos;s arranged between the two of you —
                Cooachly Arts doesn&apos;t process or track payment.
              </li>
              <li>
                Questions about a specific guru&apos;s rate? Message them directly from their
                profile, or{" "}
                <Link href="/arts/contact" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
                  contact us
                </Link>{" "}
                if you need help.
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
