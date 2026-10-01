import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { HeroIllustration, MathIcon, ChemistryIcon, PhysicsIcon, TextBadge, GlobeReachIllustration } from "@/components/illustrations";

export default function Home() {
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
          <Link href="/about" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            About
          </Link>
          <Link href="/pricing" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Pricing
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
          <Link href="/arts" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Arts (Carnatic vocals)
          </Link>
          <Link href="/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main>
        <section className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-5xl">
                Expert guidance.
                <br />
                Better learning.
                <br />
                Brighter future.
              </h1>
              <p className="mt-6 max-w-md text-lg text-black/60 dark:text-white/60">
                Live online classes, mentored by qualified educators — book 1:1 coaching sessions
                that fit your schedule, in your own timezone.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/demo">
                  <Button className="px-6 py-3 text-base">Book a free 30-min demo</Button>
                </Link>
              </div>
            </div>
            <HeroIllustration className="w-full max-w-lg justify-self-center" />
          </div>
        </section>

        {/* Mission banner */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl bg-brand-900 px-6 py-6 text-white sm:px-10 sm:py-8">
            <p className="text-lg font-semibold sm:text-xl">Learn online, excel everywhere.</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-accent-300">
              <span>Concept Clarity</span>
              <span>Personal Attention</span>
              <span>Better Results</span>
              <span>Future Ready</span>
            </div>
          </div>
        </section>

        {/* Subjects */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
            Subjects we specialize in
          </h2>
          <div className="mt-8 grid grid-cols-2 gap-8 sm:grid-cols-4 md:grid-cols-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <MathIcon />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Mathematics</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <ChemistryIcon />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Chemistry</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <PhysicsIcon />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Physics</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="Bio" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Biology</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="PSAT" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">PSAT</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="SAT" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">SAT</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="ACT" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">ACT</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="Econ" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Economics</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="Psych" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Psychology</span>
            </div>
            <div className="flex flex-col items-center gap-3 text-center">
              <TextBadge label="Law" />
              <span className="font-semibold text-brand-900 dark:text-brand-300">Legal Studies</span>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-black/50 dark:text-white/50">
            …and more — every coach on Cooachly sets their own subjects, pricing, and availability.
          </p>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Feature
              title="Timezone-aware scheduling"
              description="Professors set their weekly availability once. Students always see open slots converted to their own local time."
            />
            <Feature
              title="Reminders that reach you"
              description="Automatic email and WhatsApp reminders 1 day, 1 hour, and 5 minutes before every session."
            />
            <Feature
              title="AI session summaries"
              description="Sessions can be recorded and automatically summarized by AI, with the recap emailed to both student and professor afterward."
            />
            <Feature
              title="Built-in video calls"
              description="Every confirmed booking gets its own video room — no separate app or link to hunt for."
            />
            <Feature
              title="Messaging"
              description="Coordinate details with your coach or student directly in Cooachly."
            />
            <Feature
              title="Secure payments"
              description="Students pay per session or subscribe monthly via Stripe. Professors track earnings from their dashboard."
            />
          </div>
        </section>

        {/* Global reach banner */}
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="overflow-hidden rounded-2xl bg-brand-800">
            <div className="grid items-center gap-6 p-6 sm:grid-cols-2 sm:p-10">
              <div className="text-white">
                <h3 className="text-lg font-semibold">Guided by qualified educators</h3>
                <p className="mt-2 text-sm text-accent-100">
                  Expert teaching, wherever you are. Your success is our mission.
                </p>
              </div>
              <GlobeReachIllustration className="w-full" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <Card className="mx-auto max-w-2xl py-10">
            <h2 className="text-2xl font-semibold text-brand-900 dark:text-brand-300">
              Together, let&apos;s learn and grow.
            </h2>
            <p className="mt-2 text-black/60 dark:text-white/60">
              Join Cooachly today and book your first session.
            </p>
            <div className="mt-6">
              <Link href="/demo">
                <Button className="px-8 py-3 text-base">Book your free demo</Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-black/40 dark:text-white/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Cooachly</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="hover:text-black dark:hover:text-white">
              Pricing
            </Link>
            <Link href="/faq" className="hover:text-black dark:hover:text-white">
              FAQ
            </Link>
            <Link href="/become-a-coach" className="hover:text-black dark:hover:text-white">
              Become a coach
            </Link>
            <Link href="/contact" className="hover:text-black dark:hover:text-white">
              Contact us
            </Link>
            <Link href="/arts" className="hover:text-black dark:hover:text-white">
              Cooachly Arts (Carnatic vocals) →
            </Link>
            <span>For enquiries: +91 80151 51896</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-black/10 p-6 dark:border-white/10">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">{description}</p>
    </div>
  );
}
