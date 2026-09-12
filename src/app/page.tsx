import Link from "next/link";
import { Button } from "@/components/ui";

export default function Home() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="text-xl font-semibold tracking-tight">Cooachly</span>
        <nav className="flex items-center gap-3">
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
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Coaching sessions, scheduled across any timezone.
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
            title="Messaging & video links"
            description="Coordinate details with in-app messaging, and share a video call link for every booked session."
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
