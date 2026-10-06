"use client";

import { useActionState } from "react";
import { saveGrades } from "@/actions/tests";
import { Button, Input, Textarea } from "@/components/ui";

type QuestionWithAnswer = {
  id: string;
  type: string;
  prompt: string;
  maxMarks: number;
  modelAnswer: string | null;
  options: { id: string; text: string; isCorrect: boolean }[];
  answer: {
    selectedOptionId: string | null;
    textAnswer: string | null;
    fileName: string | null;
    fileUrl: string | null;
    marksAwarded: number | null;
    comment: string | null;
  } | null;
};

export function GradeAssignmentForm({ assignmentId, questions }: { assignmentId: string; questions: QuestionWithAnswer[] }) {
  const [state, action, pending] = useActionState(saveGrades, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      {questions.map((q, i) => {
        const selectedOption = q.options.find((o) => o.id === q.answer?.selectedOptionId);
        return (
          <div key={q.id} className="rounded-lg border border-black/10 p-4 dark:border-white/10">
            <p className="text-sm font-medium">
              Q{i + 1}. {q.prompt} <span className="font-normal text-black/50 dark:text-white/50">({q.maxMarks} pts)</span>
            </p>

            <div className="mt-2 rounded-md bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
              {q.type === "MULTIPLE_CHOICE" ? (
                selectedOption ? (
                  <p className={selectedOption.isCorrect ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                    {selectedOption.text} {selectedOption.isCorrect ? "(correct)" : "(incorrect)"}
                  </p>
                ) : (
                  <p className="text-black/40 dark:text-white/40">No answer selected.</p>
                )
              ) : q.type === "FILE_UPLOAD" ? (
                q.answer?.fileUrl ? (
                  <a href={q.answer.fileUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">
                    {q.answer.fileName || "View uploaded file"}
                  </a>
                ) : (
                  <p className="text-black/40 dark:text-white/40">No file uploaded.</p>
                )
              ) : q.answer?.textAnswer ? (
                <p className="whitespace-pre-wrap">{q.answer.textAnswer}</p>
              ) : (
                <p className="text-black/40 dark:text-white/40">No answer given.</p>
              )}
            </div>
            {q.modelAnswer && (
              <p className="mt-2 text-xs text-black/60 dark:text-white/60">
                <strong>Model answer:</strong> {q.modelAnswer}
              </p>
            )}

            <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
              <div>
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Marks (/{q.maxMarks})</label>
                <Input name={`marks-${q.id}`} type="number" min={0} max={q.maxMarks} defaultValue={q.answer?.marksAwarded ?? ""} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Comment (optional)</label>
                <Textarea name={`comment-${q.id}`} rows={1} defaultValue={q.answer?.comment ?? ""} />
              </div>
            </div>
          </div>
        );
      })}

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save grades"}
      </Button>
    </form>
  );
}
