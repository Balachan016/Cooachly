import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";

export const metadata = {
  title: "FAQ — Cooachly Arts",
};

const FAQS: { id?: string; question: string; answer: React.ReactNode }[] = [
  {
    question: "What does the standard plan include?",
    answer: "The standard plan is $120/month and includes 8 classes (2 per week), each roughly 45 minutes — extendable up to an hour if your guru needs the extra time. Individual gurus may also offer their own per-class or monthly pricing, shown on their profile.",
  },
  {
    question: "How does the free demo work?",
    answer: "Your very first class with Cooachly Arts is always a free, no-obligation demo session. Pick a level and an available time slot, and you'll get a video call link right away — no payment required. Regular paid classes only begin once you're ready to enroll and payment is confirmed.",
  },
  {
    id: "rescheduling",
    question: "What's the rescheduling and cancellation policy?",
    answer: (
      <>
        You can reschedule a class for free if you let your guru know at least 24 hours in
        advance. Each class comes with one free reschedule under this notice window. If a
        class is cancelled or rescheduled with less than 24 hours&apos; notice (or missed without
        notice), 50% of that class&apos;s fee may apply. If you need more flexibility, just{" "}
        <Link href="/arts/contact" className="font-medium text-brand-700 hover:underline dark:text-brand-400">
          reach out
        </Link>{" "}
        and we&apos;ll work with you.
      </>
    ),
  },
  {
    id: "referrals",
    question: "Is there a referral program?",
    answer: "Yes! Refer 3 actively enrolled students and get 15% off your monthly plan; refer 5 and get 25% off. The discount applies as long as the referred students remain actively enrolled, and referrals must enroll within 6 months of being referred. Ask your guru or contact us to get started.",
  },
  {
    question: "Do weekday classes cost more than weekend classes?",
    answer: "Weekend classes are the standard, most economical option. Once the school year is in session, weekday availability can be more limited, so weekday slots may carry a small premium — your guru will always let you know before you book.",
  },
  {
    question: "How does scheduling work across timezones?",
    answer: "Every guru sets their weekly availability once. When you book, all times are automatically converted and shown in your own local timezone — no manual conversion needed.",
  },
  {
    question: "How do I pay?",
    answer: "All payments are handled securely through Stripe — pay per class or subscribe monthly. No manual transfers or cash payments are needed.",
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
