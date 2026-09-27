import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { Logo } from "@/components/logo";

export const metadata = {
  title: "Create your account — Cooachly",
};

export default function RegisterClosedPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Home
      </Link>
      <Link href="/" className="mb-8">
        <Logo withTagline />
      </Link>
      <Card className="w-full max-w-sm text-center">
        <h1 className="text-xl font-semibold">Accounts start with a free demo</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Cooachly accounts are set up for you after your free demo session. Book one below, and
          once you&apos;re ready to continue, we&apos;ll send you a personal link to create your login.
        </p>
        <Link href="/demo" className="mt-6 block">
          <Button className="w-full">Book a free demo</Button>
        </Link>
        <p className="mt-4 text-sm text-black/60 dark:text-white/60">
          Already have an invite link? Check your email, or{" "}
          <Link href="/contact" className="font-medium text-brand-700 hover:underline">
            contact us
          </Link>
          .
        </p>
        <p className="mt-6 text-sm text-black/60 dark:text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
