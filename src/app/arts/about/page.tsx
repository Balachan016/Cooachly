import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";
import { CarnaticHeroIllustration, RagaIcon, LayaIcon, SahityaIcon } from "@/components/arts/illustrations";

export const metadata = {
  title: "About Cooachly Arts",
};

export default function AboutPage() {
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

      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-4xl">
              About Cooachly Arts
            </h1>
            <p className="mt-4 text-lg text-black/70 dark:text-white/70">
              Sruti. Laya. Bhava. Passed on, one voice at a time.
            </p>
            <p className="mt-6 max-w-2xl text-black/60 dark:text-white/60">
              Cooachly Arts is a live, online platform connecting students with qualified,
              dedicated Carnatic vocal gurus for personalized 1:1 classes. Whether you&apos;re a
              beginner learning your first varnam or preparing for concert-level kritis, Cooachly
              Arts makes it simple to find the right guru, book a class that fits your schedule,
              and learn from anywhere.
            </p>
          </div>
          <CarnaticHeroIllustration className="w-full max-w-sm justify-self-center" />
        </div>

        <div className="mt-10 rounded-xl bg-brand-900 px-6 py-4 text-white">
          <p className="font-semibold">Learn online, sing anywhere.</p>
          <p className="mt-1 text-sm text-accent-300">
            Sruti Shuddham &nbsp;•&nbsp; Personal attention &nbsp;•&nbsp; Stage-ready confidence &nbsp;•&nbsp; Tradition, kept alive
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <AboutCard title="Live online classes" description="Real-time, interactive 1:1 sessions with your own dedicated guru." />
          <AboutCard title="Qualified gurus" description="Every guru on Cooachly Arts is vetted before they can list classes." />
          <AboutCard title="Flexible scheduling" description="Weekday and weekend batches, in your own timezone." />
        </div>

        <h2 className="mt-16 text-center text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
          What every class covers
        </h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <RagaIcon />
            <span className="font-semibold text-brand-900 dark:text-brand-300">Raga (Melody)</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <LayaIcon />
            <span className="font-semibold text-brand-900 dark:text-brand-300">Laya (Rhythm)</span>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <SahityaIcon />
            <span className="font-semibold text-brand-900 dark:text-brand-300">Sahitya (Lyrics)</span>
          </div>
        </div>

        <h2 className="mt-16 text-xl font-semibold">How it works</h2>
        <ol className="mt-4 space-y-3 text-black/70 dark:text-white/70">
          <li><strong>1. Find your guru.</strong> Browse gurus by level and see their availability.</li>
          <li><strong>2. Book a class.</strong> Pick a time slot shown in your own local timezone.</li>
          <li><strong>3. Join &amp; learn.</strong> Get reminders by email and WhatsApp, then join your class with one click.</li>
          <li><strong>4. Review afterward.</strong> Classes can be recorded and summarized by AI so you never lose track of what was covered.</li>
        </ol>

        <div className="mt-16 flex gap-4">
          <Link href="/arts/register">
            <Button className="px-6 py-3 text-base">Get started</Button>
          </Link>
          <Link href="/arts">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Back to home
            </Button>
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

function AboutCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <h3 className="font-semibold text-brand-800 dark:text-brand-400">{title}</h3>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">{description}</p>
    </Card>
  );
}
