"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "@/actions/auth";
import { Button, Card, Input, Label } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/arts" className="mb-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Home
      </Link>
      <Link href="/arts" className="mb-8">
        <ArtsLogo withTagline />
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Enter your account email and we&apos;ll send you a link to reset your password.
        </p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="site" value="ARTS" />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
          </div>

          {state?.message && (
            <p className="text-sm text-black/70 dark:text-white/70">{state.message}</p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Sending…" : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-black/60 dark:text-white/60">
          <Link href="/arts/login" className="font-medium text-brand-700 hover:underline">
            Back to login
          </Link>
        </p>
      </Card>
    </div>
  );
}
