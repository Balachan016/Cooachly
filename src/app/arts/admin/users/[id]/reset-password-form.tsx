"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { adminResetPassword, sendPasswordResetEmail } from "@/actions/admin";
import { Button, Input, Label } from "@/components/ui";

export function ResetPasswordForm({ userId }: { userId: string }) {
  const action = adminResetPassword.bind(null, userId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  const [isSendingEmail, startEmailTransition] = useTransition();
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  function handleSendEmail() {
    setEmailMessage(null);
    startEmailTransition(async () => {
      const result = await sendPasswordResetEmail(userId);
      setEmailMessage(result?.message ?? null);
    });
  }

  return (
    <div className="mt-4 space-y-6">
      <div>
        <Button variant="secondary" disabled={isSendingEmail} onClick={handleSendEmail}>
          {isSendingEmail ? "Sending…" : "Email password reset link"}
        </Button>
        <p className="mt-1 text-xs text-black/50 dark:text-white/50">
          Sends the same secure self-service link as &quot;Forgot password&quot; — they set their own new
          password, no old password needed.
        </p>
        {emailMessage && (
          <p className="mt-2 text-sm text-black/70 dark:text-white/70">{emailMessage}</p>
        )}
      </div>

      <div className="border-t border-black/10 pt-4 dark:border-white/10">
        <p className="text-sm font-medium">Or set a password directly</p>
        <form ref={formRef} action={formAction} className="mt-2 space-y-4">
          <div>
            <Label htmlFor="newPassword">New password</Label>
            <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
          </div>

          {state?.message && (
            <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
              {state.message}
            </p>
          )}

          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Resetting…" : "Set password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
