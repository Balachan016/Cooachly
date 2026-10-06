"use client";

import { useActionState } from "react";
import { importQuestionsFromTemplate } from "@/actions/tests";
import { Button } from "@/components/ui";

export function ImportQuestionsForm({ testId }: { testId: string }) {
  const [state, action, pending] = useActionState(importQuestionsFromTemplate, undefined);

  return (
    <div className="space-y-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <p className="text-sm font-medium">Or add questions in bulk from a Word file</p>
      <p className="text-xs text-black/60 dark:text-white/60">
        Download the template, fill in one table per question, then upload it here — every question in the file gets
        added at once.
      </p>
      <a href="/api/tests/template" download className="inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        Download the question template (.docx)
      </a>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="testId" value={testId} />
        <input
          type="file"
          name="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          required
          className="block text-sm"
        />
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Importing…" : "Upload & add questions"}
        </Button>
      </form>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
