"use client";

import { useActionState } from "react";
import { deleteQuestion } from "@/actions/tests";
import { Button } from "@/components/ui";

export function DeleteQuestionButton({ questionId }: { questionId: string }) {
  const [, action, pending] = useActionState(deleteQuestion, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="questionId" value={questionId} />
      <Button type="submit" variant="secondary" disabled={pending} className="shrink-0">
        {pending ? "Removing…" : "Remove"}
      </Button>
    </form>
  );
}
