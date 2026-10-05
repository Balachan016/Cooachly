"use client";

import { useActionState, useState, useTransition } from "react";
import type { User } from "@prisma/client";
import { setUserActive, adminResetPassword, sendPasswordResetEmail, changeAdminEmail, deleteUserAccount } from "@/actions/admin";
import { Badge, Button, Input } from "@/components/ui";

export function AdminRow({ admin, currentUserId }: { admin: User; currentUserId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showReset, setShowReset] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const resetAction = adminResetPassword.bind(null, admin.id);
  const [resetState, resetFormAction, resetPending] = useActionState(resetAction, undefined);
  const emailAction = changeAdminEmail.bind(null, admin.id);
  const [emailState, emailFormAction, emailPending] = useActionState(emailAction, undefined);
  const isSelf = admin.id === currentUserId;

  const [isSendingReset, startResetEmail] = useTransition();
  const [resetEmailMessage, setResetEmailMessage] = useState<string | null>(null);
  function handleSendResetEmail() {
    setResetEmailMessage(null);
    startResetEmail(async () => {
      const result = await sendPasswordResetEmail(admin.id);
      setResetEmailMessage(result?.message ?? null);
    });
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete ${admin.name}'s (${admin.email}) ${admin.role === "SUPERADMIN" ? "superadmin" : "admin"} account? This also deletes every booking, message, review, and subscription they're party to. This cannot be undone.`
    );
    if (!confirmed) return;
    startTransition(() => {
      void deleteUserAccount(admin.id);
    });
  }

  return (
    <>
      <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
        <td className="px-4 py-3">
          <Badge>{admin.site}</Badge>
        </td>
        <td className="px-4 py-3 font-medium">
          {admin.name}
          {isSelf && <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">(you)</span>}
        </td>
        <td className="px-4 py-3 text-black/60 dark:text-white/60">{admin.email}</td>
        <td className="px-4 py-3">
          <Badge tone={admin.role === "SUPERADMIN" ? "warning" : "default"}>{admin.role}</Badge>
        </td>
        <td className="px-4 py-3">
          <Badge tone={admin.isActive ? "success" : "danger"}>{admin.isActive ? "Active" : "Disabled"}</Badge>
        </td>
        <td className="px-4 py-3 text-black/60 dark:text-white/60">
          {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(admin.createdAt)}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={isSendingReset} onClick={handleSendResetEmail}>
              {isSendingReset ? "Sending…" : "Email reset link"}
            </Button>
            <Button variant="secondary" onClick={() => setShowReset((v) => !v)}>
              {showReset ? "Cancel" : "Reset password"}
            </Button>
            <Button variant="secondary" onClick={() => setShowEmail((v) => !v)}>
              {showEmail ? "Cancel" : "Change email"}
            </Button>
            {admin.role !== "SUPERADMIN" && !isSelf && (
              <>
                <Button
                  variant={admin.isActive ? "danger" : "secondary"}
                  disabled={isPending}
                  onClick={() => startTransition(() => setUserActive(admin.id, !admin.isActive))}
                >
                  {admin.isActive ? "Disable" : "Enable"}
                </Button>
                <Button variant="danger" disabled={isPending} onClick={handleDelete}>
                  Delete
                </Button>
              </>
            )}
          </div>
          {resetEmailMessage && (
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">{resetEmailMessage}</p>
          )}
        </td>
      </tr>
      {showEmail && (
        <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
          <td colSpan={7} className="bg-black/[0.02] px-4 py-3 dark:bg-white/[0.02]">
            <form action={emailFormAction} className="flex flex-wrap items-end gap-3">
              <div className="w-64">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                  New email for {admin.name}
                </label>
                <Input name="email" type="email" required defaultValue={admin.email} />
              </div>
              <Button type="submit" variant="secondary" disabled={emailPending}>
                {emailPending ? "Saving…" : "Save email"}
              </Button>
              {emailState?.message && (
                <p
                  className={`text-sm ${emailState.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {emailState.message}
                </p>
              )}
            </form>
          </td>
        </tr>
      )}
      {showReset && (
        <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
          <td colSpan={7} className="bg-black/[0.02] px-4 py-3 dark:bg-white/[0.02]">
            <form action={resetFormAction} className="flex flex-wrap items-end gap-3">
              <div className="w-64">
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">
                  New password for {admin.name}
                </label>
                <Input name="newPassword" type="password" required minLength={8} />
              </div>
              <Button type="submit" variant="secondary" disabled={resetPending}>
                {resetPending ? "Resetting…" : "Reset password"}
              </Button>
              {resetState?.message && (
                <p
                  className={`text-sm ${resetState.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}
                >
                  {resetState.message}
                </p>
              )}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
