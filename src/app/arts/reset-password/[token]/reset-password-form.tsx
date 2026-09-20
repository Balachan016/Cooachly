"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { resetPassword } from "@/actions/auth";
import { Button, FormMessage, Input, Label } from "@/components/ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const action = resetPassword.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      const timeout = setTimeout(() => router.push("/arts/login"), 2000);
      return () => clearTimeout(timeout);
    }
  }, [state, router]);

  if (state?.success) {
    return (
      <div className="mt-6 space-y-4">
        <p className="text-sm text-black/70 dark:text-white/70">{state.message}</p>
        <Link href="/arts/login" className="text-sm font-medium text-brand-700 hover:underline">
          Go to login now
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Reset password"}
      </Button>
    </form>
  );
}
