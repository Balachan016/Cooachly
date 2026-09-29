import Link from "next/link";
import { Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { DemoBookingForm } from "./demo-booking-form";

export const metadata = {
  title: "Book a Free Demo — Cooachly",
};

export default async function DemoPage() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo withTagline />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Home
          </Link>
          <Link href="/pricing" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Pricing
          </Link>
          <Link href="/faq" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            FAQ
          </Link>
          <Link href="/become-a-coach" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Become a coach
          </Link>
          <Link href="/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300">
          Book a free 30-minute demo
        </h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          No payment required. Tell us a bit about what you&apos;re looking for and we&apos;ll reach
          out shortly to schedule a time that works for you.
        </p>

        <Card className="mt-8">
          <DemoBookingForm site="COOACHLY" />
        </Card>
      </main>
    </div>
  );
}
