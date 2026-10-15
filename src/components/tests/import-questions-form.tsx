"use client";

import { useActionState } from "react";
import { importQuestionsFromTemplate } from "@/actions/tests";
import { Button } from "@/components/ui";

export function ImportQuestionsForm({ testId }: { testId: string }) {
  const [state, action, pending] = useActionState(importQuestionsFromTemplate, undefined);

  return (
    <div className="space-y-3 rounded-lg border border-black/10 p-3 dark:border-white/10">
      <p className="text-sm font-medium">Or add questions in bulk from a file</p>
      <p className="text-xs text-black/60 dark:text-white/60">
        Download the Word template, fill in one table per question, then upload it here — every question in the file
        gets added at once. You can also upload a free-text question paper instead, as a Word doc or a PDF.
      </p>
      <p className="text-xs text-black/60 dark:text-white/60">
        <strong>Word question paper:</strong> numbered questions like &quot;1. Title (10 points)&quot; (optionally
        grouped under section headings), each followed by its prompt text, then an &quot;Answer Key&quot; heading
        with matching numbered entries. An &quot;Instructions&quot; section and a &quot;Formula Sheet&quot; table
        before the questions are picked up too, and shown to the student before they start the test.
      </p>
      <p className="text-xs text-black/60 dark:text-white/60">
        <strong>PDF question paper:</strong> numbered questions each ending in &quot;[N points]&quot;, followed by a
        numbered &quot;ANSWER KEY &amp; SOLUTION GUIDE&quot; section.
      </p>
      <p className="text-xs text-black/60 dark:text-white/60">
        Either free-text format imports every question as Long Answer, with the matching answer-key entry filled in
        as its model answer.
      </p>
      <a href="/api/tests/template" download className="inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
        Download the question template (.docx)
      </a>
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="testId" value={testId} />
        <input
          type="file"
          name="file"
          accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
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
