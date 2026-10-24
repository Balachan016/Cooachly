import Link from "next/link";
import { Card } from "@/components/ui";
import { Logo } from "@/components/logo";
import { ContactForm } from "./contact-form";

export const metadata = {
  title: "Contact Cooachly",
};

export default function ContactPage() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-4 px-6 py-6">
        <Link href="/">
          <Logo withTagline />
        </Link>
        <nav className="flex w-full items-center justify-end gap-4 sm:w-auto">
          <Link href="/" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Home
          </Link>
          <Link href="/pricing" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            Pricing
          </Link>
          <Link href="/faq" className="hidden text-sm font-medium text-black/70 hover:text-black sm:inline dark:text-white/70 dark:hover:text-white">
            FAQ
          </Link>
          <Link href="/become-a-coach" className="whitespace-nowrap rounded-full bg-accent-300 px-3 py-1.5 text-sm font-semibold text-brand-900 shadow-sm ring-1 ring-brand-900/15 hover:brightness-95 dark:text-brand-950">
            Become a coach
          </Link>
          <Link href="/login" className="text-sm font-medium text-black/70 hover:text-black dark:text-white/70 dark:hover:text-white">
            Log in
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight text-brand-900 dark:text-brand-300">Get in touch</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          Questions about subjects, pricing, or scheduling? Send us a message and we&apos;ll reply soon.
        </p>

        <Card className="mt-8">
          <ContactForm />
        </Card>
      </main>
    </div>
  );
}
