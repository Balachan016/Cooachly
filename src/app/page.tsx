import Link from "next/link";
import { Button } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo withTagline />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/about" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            About
          </Link>
          <Link href="/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tight text-green-900 dark:text-green-300 sm:text-5xl">
            Expert guidance. Better learning. Brighter future.
          </h1>
          <p className="mt-6 text-lg text-black/60 dark:text-white/60">
            Cooachly connects students with professors for 1:1 coaching. Book sessions
            that automatically convert to each person&apos;s local time, message your coach,
            and pay securely — all in one place.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/register">
              <Button className="px-6 py-3 text-base">Create your account</Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary" className="px-6 py-3 text-base">
                I already have an account
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-3">
          <Feature
            title="Timezone-aware scheduling"
            description="Professors set their weekly availability once. Students always see open slots converted to their own local time."
          />
          <Feature
            title="Reminders that reach you"
            description="Automatic email, SMS, and WhatsApp reminders 1 day, 1 hour, and 5 minutes before every session."
          />
          <Feature
            title="AI session summaries"
            description="Sessions are recorded and automatically summarized by AI, with the recap emailed to both student and professor afterward."
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
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-black/40 dark:text-white/40">
        © {new Date().getFullYear()} Cooachly
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
