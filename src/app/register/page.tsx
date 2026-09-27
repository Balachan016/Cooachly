"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signup } from "@/actions/auth";
import { Button, Card, FormMessage, Input, Label, Select } from "@/components/ui";
import { Logo } from "@/components/logo";
import { TIMEZONES } from "@/lib/roles";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signup, undefined);
  const [role, setRole] = useState<"STUDENT" | "PROFESSOR">("STUDENT");
  const [detectedTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="mb-2 text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        ← Home
      </Link>
      <Link href="/" className="mb-8">
        <Logo withTagline />
      </Link>
      <Card className="w-full max-w-sm">
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Join Cooachly as a student or a professor.
        </p>

        <form action={action} className="mt-6 space-y-4">
          <div>
            <Label>I am a…</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["STUDENT", "PROFESSOR"] as const).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                    role === r
                      ? "border-brand-700 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-accent-500"
                      : "border-black/15 text-black/70 dark:border-white/15 dark:text-white/70"
                  }`}
                >
                  {r === "STUDENT" ? "Student" : "Professor"}
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role} />
          </div>

          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" placeholder="Jane Doe" required />
            <FormMessage>{state?.errors?.name?.[0]}</FormMessage>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            <FormMessage>{state?.errors?.email?.[0]}</FormMessage>
          </div>
          <div>
            <Label htmlFor="phone">Phone (optional, for WhatsApp reminders)</Label>
            <Input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
            <FormMessage>{state?.errors?.phone?.[0]}</FormMessage>
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" required minLength={8} />
            <FormMessage>{state?.errors?.password?.[0]}</FormMessage>
          </div>
          <div>
            <Label htmlFor="timezone">Your timezone</Label>
            <Select id="timezone" name="timezone" defaultValue={detectedTimezone} required>
              {!TIMEZONES.includes(detectedTimezone) && (
                <option value={detectedTimezone}>{detectedTimezone}</option>
              )}
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </Select>
            <FormMessage>{state?.errors?.timezone?.[0]}</FormMessage>
          </div>

          {state?.message && <FormMessage>{state.message}</FormMessage>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-black/60 dark:text-white/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-700 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
