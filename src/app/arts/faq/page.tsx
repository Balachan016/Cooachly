import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";

export const metadata = {
  title: "FAQ — Cooachly Arts",
};

const FAQS: { id?: string; question: string; answer: React.ReactNode }[] = [
  {
    question: "Is there a subscription or plan I need to buy?",
    answer: "No. Cooachly Arts doesn't sell plans or charge for classes — every class is fixed at 30 minutes and simply auto-confirms once you pick a slot. Your rate is whatever you and your guru agree on directly, not something the platform sets.",
  },
  {
    question: "How does the free demo work?",
    answer: "Your very first class with Cooachly Arts is always a free, no-obligation demo session. Pick a level and an available time slot, and you'll get a video call link right away — no payment involved, same as every other class.",
  },
  {
    id: "rescheduling",
    question: "What's the rescheduling and cancellation policy?",
    answer: (
      <>
        You can cancel or reschedule a class from your bookings page any time before it starts.
        Since Cooachly Arts doesn&apos;t collect payment, there&apos;s no platform cancellation fee —
        if your guru asks for notice or a fee for late cancellations, that&apos;s something you
        agree on directly with them. If you need help, just{" "}
        <Link href="/arts/contact" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
          reach out
        </Link>
        .
      </>
    ),
  },
  {
    question: "How does scheduling work across timezones?",
    answer: "Every guru sets their weekly availability once. When you book, all times are automatically converted and shown in your own local timezone — no manual conversion needed.",
  },
  {
    id: "how-rates-work",
    question: "How do rates and payment work?",
    answer: "Cooachly Arts doesn't process payment at all — there's no price shown at booking, and no charge on your card. Each guru sets and shares their own rate directly with students, usually in their profile bio or your first message with them, and payment is arranged between the two of you outside the platform.",
  },
  {
    question: "Are gurus vetted?",
    answer: "Yes. Every guru on Cooachly Arts is reviewed before they're able to list classes, and both students and gurus rate each other after every class to keep quality high.",
  },
  {
    question: "Do I need prior Carnatic music experience to start?",
    answer: "No — gurus teach absolute beginners through concert-ready students. During your free demo, your guru will assess your level and suggest a starting point, whether that's sarali varisai fundamentals or refining an existing repertoire.",
  },
];

export default function FaqPage() {
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

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300 sm:text-4xl">
          Frequently asked questions
        </h1>
        <p className="mt-3 text-black/60 dark:text-white/60">
          General rules and policies for students and parents. Can&apos;t find your answer?{" "}
          <Link href="/arts/contact" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
            Contact us
          </Link>
          .
        </p>

        <div className="mt-8 space-y-3">
          {FAQS.map((faq) => (
            <Card key={faq.question} id={faq.id} className="p-0">
              <details className="group p-5">
                <summary className="cursor-pointer list-none font-medium text-black/90 marker:content-none dark:text-white/90">
                  <span className="flex items-center justify-between gap-4">
                    {faq.question}
                    <span className="text-black/40 transition-transform group-open:rotate-45 dark:text-white/40">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-sm text-black/60 dark:text-white/60">{faq.answer}</p>
              </details>
            </Card>
          ))}
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
