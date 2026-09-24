"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login } from "@/actions/auth";
import { Button, Card, FormMessage, Input, Label } from "@/components/ui";
import { ArtsLogo } from "@/components/arts/logo";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/arts" className="mb-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Home
      </Link>
      <Link href="/arts" className="mb-8">
        <ArtsLogo withTagline />
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">Log in to your Cooachly Arts account.</p>

        <form action={action} className="mt-6 space-y-4">
          <input type="hidden" name="site" value="ARTS" />
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            <FormMessage>{state?.errors?.email?.[0]}</FormMessage>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/arts/forgot-password" className="mb-1 text-sm font-medium text-brand-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input id="password" name="password" type="password" required />
            <FormMessage>{state?.errors?.password?.[0]}</FormMessage>
          </div>

          {state?.message && <FormMessage>{state.message}</FormMessage>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-black/60 dark:text-white/60">
          Don&apos;t have an account?{" "}
          <Link href="/arts/register" className="font-medium text-brand-700 hover:underline">
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
