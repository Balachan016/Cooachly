import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "About Cooachly",
};

export default function AboutPage() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo withTagline />
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
          <Link href="/register">
            <Button>Get started</Button>
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold tracking-tight text-green-900 dark:text-green-300 sm:text-4xl">
          About Cooachly
        </h1>
        <p className="mt-4 text-lg text-black/70 dark:text-white/70">
          Expert guidance. Better learning. Brighter future.
        </p>
        <p className="mt-6 max-w-2xl text-black/60 dark:text-white/60">
          Cooachly is a live, online coaching platform connecting students with qualified,
          dedicated professors for personalized 1:1 sessions. Whether you&apos;re preparing for
          exams, building core concepts, or working toward long-term academic goals, Cooachly
          makes it simple to find the right coach, book a session that fits your schedule, and
          learn from anywhere.
        </p>

        <div className="mt-10 rounded-xl bg-green-900 px-6 py-4 text-white">
          <p className="font-semibold">Learn online, excel everywhere.</p>
          <p className="mt-1 text-sm text-lime-300">
            Concept clarity &nbsp;•&nbsp; Personal attention &nbsp;•&nbsp; Better results &nbsp;•&nbsp; Future ready
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <AboutCard title="Live online classes" description="Real-time, interactive 1:1 sessions with your own dedicated coach." />
          <AboutCard title="Qualified educators" description="Every professor on Cooachly is vetted before they can list sessions." />
          <AboutCard title="Flexible scheduling" description="Weekday and weekend batches, in your own timezone." />
        </div>

        <h2 className="mt-16 text-xl font-semibold">How it works</h2>
        <ol className="mt-4 space-y-3 text-black/70 dark:text-white/70">
          <li><strong>1. Find your coach.</strong> Browse professors by subject and see their availability.</li>
          <li><strong>2. Book a session.</strong> Pick a time slot shown in your own local timezone.</li>
          <li><strong>3. Join &amp; learn.</strong> Get reminders by email, SMS, and WhatsApp, then join your session with one click.</li>
          <li><strong>4. Review afterward.</strong> Every session is recorded and summarized by AI so you never lose track of what was covered.</li>
        </ol>

        <div className="mt-16 flex gap-4">
          <Link href="/register">
            <Button className="px-6 py-3 text-base">Get started</Button>
          </Link>
          <Link href="/">
            <Button variant="secondary" className="px-6 py-3 text-base">
              Back to home
            </Button>
          </Link>
        </div>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-black/40 dark:text-white/40">
        © {new Date().getFullYear()} Cooachly
      </footer>
    </div>
  );
}

function AboutCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <h3 className="font-semibold text-green-800 dark:text-green-400">{title}</h3>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">{description}</p>
    </Card>
  );
}
