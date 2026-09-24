import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";
import { CarnaticHeroIllustration, RagaIcon, LayaIcon, SahityaIcon, TempleBannerIllustration } from "@/components/arts/illustrations";

export default function ArtsHome() {
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
          <Link href="/arts/about" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            About
          </Link>
          <Link href="/arts/pricing" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Pricing
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

      {/* Hero */}
      <main>
        <section className="mx-auto max-w-6xl px-6 py-10 sm:py-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-brand-900 px-4 py-1 text-xs font-semibold tracking-wide text-accent-300">
                CARNATIC VOCALS · ALL AGES & LEVELS
              </span>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-5xl">
                Sruti. Laya.
                <br />
                Bhava. Passed on,
                <br />
                one voice at a time.
              </h1>
              <p className="mt-6 max-w-md text-lg text-black/60 dark:text-white/60">
                Live online Carnatic vocal classes, mentored by qualified gurus — book fixed
                30-minute 1:1 classes that fit your schedule, in your own timezone.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link href="/arts/demo">
                  <Button className="px-6 py-3 text-base">Book a free 30-min demo</Button>
                </Link>
                <Link href="/arts/register">
                  <Button variant="secondary" className="px-6 py-3 text-base">
                    Create your account
                  </Button>
                </Link>
              </div>
              <p className="mt-3 text-sm text-black/50 dark:text-white/50">
                No payment through the platform, ever — you and your guru arrange your rate directly.
              </p>
            </div>
            <CarnaticHeroIllustration className="w-full max-w-lg justify-self-center" />
          </div>
        </section>

        {/* Mission banner */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="rounded-2xl bg-brand-900 px-6 py-6 text-white sm:px-10 sm:py-8">
            <p className="text-lg font-semibold sm:text-xl">Learn online, sing anywhere.</p>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-accent-300">
              <span>Sruti Shuddham</span>
              <span>Personal Attention</span>
              <span>Stage-Ready Confidence</span>
              <span>Tradition, Kept Alive</span>
            </div>
          </div>
        </section>

        {/* What every class covers */}
        <section className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
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
          <p className="mt-6 text-center text-sm text-black/50 dark:text-white/50">
            From sarali varisai fundamentals to concert-ready kritis — every guru on Cooachly Arts
            sets their own levels, pricing, and availability.
          </p>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-6 py-8">
          <div className="grid gap-6 sm:grid-cols-3">
            <Feature
              title="Timezone-aware scheduling"
              description="Gurus set their weekly availability once. Students always see open slots converted to their own local time."
            />
            <Feature
              title="Reminders that reach you"
              description="Automatic email and WhatsApp reminders 1 day, 1 hour, and 5 minutes before every class."
            />
            <Feature
              title="AI class summaries"
              description="Classes can be recorded and automatically summarized by AI, with the recap emailed to both student and guru afterward."
            />
            <Feature
              title="Built-in video calls"
              description="Every confirmed booking gets its own video room — no separate app or link to hunt for."
            />
            <Feature
              title="Messaging"
              description="Coordinate ragas, homework, and practice notes with your guru or student directly in Cooachly Arts."
            />
            <Feature
              title="No platform fees"
              description="Cooachly Arts doesn't charge for classes or take a cut — you and your guru agree on a rate directly, the way you would with a private teacher."
            />
          </div>
        </section>

        {/* Tradition banner */}
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="overflow-hidden rounded-2xl bg-brand-800">
            <div className="grid items-center gap-6 p-6 sm:grid-cols-2 sm:p-10">
              <div className="text-white">
                <h3 className="text-lg font-semibold">Guided by trained gurus</h3>
                <p className="mt-2 text-sm text-accent-100">
                  Authentic Carnatic tradition, wherever you are. Your musical journey is our
                  mission.
                </p>
              </div>
              <TempleBannerIllustration className="w-full" />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 py-16 text-center">
          <Card className="mx-auto max-w-2xl py-10">
            <h2 className="text-2xl font-semibold text-brand-900 dark:text-brand-300">
              Together, let&apos;s sing and grow.
            </h2>
            <p className="mt-2 text-black/60 dark:text-white/60">
              Join Cooachly Arts today and book your first class.
            </p>
            <div className="mt-6">
              <Link href="/arts/register">
                <Button className="px-8 py-3 text-base">Get started free</Button>
              </Link>
            </div>
          </Card>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-black/40 dark:text-white/40">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Cooachly Arts</span>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/arts/pricing" className="hover:text-black dark:hover:text-white">
              Pricing
            </Link>
            <Link href="/arts/faq" className="hover:text-black dark:hover:text-white">
              FAQ
            </Link>
            <Link href="/arts/become-a-coach" className="hover:text-black dark:hover:text-white">
              Become a guru
            </Link>
            <Link href="/arts/contact" className="hover:text-black dark:hover:text-white">
              Contact us
            </Link>
            <Link href="/" className="hover:text-black dark:hover:text-white">
              Cooachly academic tutoring →
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
