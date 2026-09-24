import Link from "next/link";
import { Card } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";
import { CoachApplicationForm } from "./coach-application-form";

export const metadata = {
  title: "Become a Guru — Cooachly Arts",
};

export default function BecomeACoachPage() {
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
          <Link href="/arts/pricing" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Pricing
          </Link>
          <Link href="/arts/faq" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            FAQ
          </Link>
          <Link href="/arts/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-4xl">
          Become a Cooachly Arts guru
        </h1>
        <p className="mt-3 max-w-2xl text-black/60 dark:text-white/60">
          Teach Carnatic vocals 1:1, on your own schedule, from anywhere. Tell us about yourself
          below and our team will be in touch.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <Card>
              <h2 className="font-semibold text-brand-900 dark:text-brand-300">How it works</h2>
              <ol className="mt-4 space-y-3 text-sm text-black/70 dark:text-white/70">
                <li>
                  <strong>1. Apply.</strong> Share the levels you teach, your lineage/training,
                  and background using the form.
                </li>
                <li>
                  <strong>2. Screening &amp; demo.</strong> Our team reviews your application and
                  schedules a short call and a demo class.
                </li>
                <li>
                  <strong>3. Onboarding.</strong> Once approved, we&apos;ll set up your profile
                  and availability together.
                </li>
                <li>
                  <strong>4. Start teaching.</strong> Set your own weekly availability and start
                  getting matched with students. Classes are fixed at 30 minutes.
                </li>
              </ol>
            </Card>

            <Card>
              <h2 className="font-semibold text-brand-900 dark:text-brand-300">Setting your rate</h2>
              <p className="mt-3 text-sm text-black/70 dark:text-white/70">
                Cooachly Arts doesn&apos;t process payment or take a cut — we handle scheduling,
                reminders, video calls, and messaging, and you set your own rate and collect it
                directly from each student, the same way you would as an independent teacher.
                Most gurus mention their rate in their profile bio or in their first message with
                a new student.
              </p>
            </Card>
          </div>

          <Card>
            <h2 className="font-semibold text-brand-900 dark:text-brand-300">Apply to teach</h2>
            <div className="mt-4">
              <CoachApplicationForm />
            </div>
          </Card>
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
