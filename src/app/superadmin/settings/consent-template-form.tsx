"use client";

import { useActionState } from "react";
import { updateConsentTemplate } from "@/actions/consent";
import { Button, Textarea } from "@/components/ui";

export function ConsentTemplateForm({ role, label, content }: { role: "PROFESSOR" | "STUDENT"; label: string; content: string }) {
  const [state, formAction, pending] = useActionState(updateConsentTemplate, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="role" value={role} />
      <div className="text-sm font-medium">{label}</div>
      <Textarea name="content" defaultValue={content} rows={14} required className="font-mono text-xs" />
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>{state.message}</p>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : `Save ${label} agreement`}
      </Button>
    </form>
  );
}
