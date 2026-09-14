"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/actions/account";
import { Button, Input, Label } from "@/components/ui";

export function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="mt-4 space-y-4">
      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <Input id="currentPassword" name="currentPassword" type="password" required />
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <Input id="newPassword" name="newPassword" type="password" required minLength={8} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
      </div>

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
