"use client";

import { useActionState, useRef, useState } from "react";
import { saveAnswer, saveFileAnswer, submitTest } from "@/actions/tests";
import { Button, Card, Textarea } from "@/components/ui";

type Question = {
  id: string;
  type: "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "LONG_ANSWER" | "FILE_UPLOAD";
  prompt: string;
  maxMarks: number;
  options: { id: string; text: string }[];
  answer: {
    selectedOptionId: string | null;
    textAnswer: string | null;
    fileName: string | null;
    fileUrl: string | null;
  } | null;
};

function SaveStatus({ status }: { status: "idle" | "saving" | "saved" }) {
  return (
    <div className="mt-1 h-4">
      {status === "saving" && <span className="text-xs text-black/40 dark:text-white/40">Saving…</span>}
      {status === "saved" && <span className="text-xs text-emerald-600 dark:text-emerald-400">Saved</span>}
    </div>
  );
}

function TextAnswerField({
  assignmentId,
  questionId,
  defaultValue,
  rows,
  disabled,
}: {
  assignmentId: string;
  questionId: string;
  defaultValue: string;
  rows: number;
  disabled: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(next: string) {
    setValue(next);
    setStatus("idle");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setStatus("saving");
      saveAnswer(assignmentId, questionId, { textAnswer: next }).then(() => setStatus("saved"));
    }, 900);
  }

  return (
    <div>
      <Textarea rows={rows} value={value} disabled={disabled} onChange={(e) => handleChange(e.target.value)} placeholder="Type your answer…" />
      <SaveStatus status={status} />
    </div>
  );
}

function McqField({
  assignmentId,
  questionId,
  options,
  defaultSelectedId,
  disabled,
}: {
  assignmentId: string;
  questionId: string;
  options: { id: string; text: string }[];
  defaultSelectedId: string | null;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState(defaultSelectedId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  function handleSelect(optionId: string) {
    setSelected(optionId);
    setStatus("saving");
    saveAnswer(assignmentId, questionId, { selectedOptionId: optionId }).then(() => setStatus("saved"));
  }

  return (
    <div>
      <div className="space-y-2">
        {options.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={`q-${questionId}`}
              checked={selected === o.id}
              disabled={disabled}
              onChange={() => handleSelect(o.id)}
              className="h-4 w-4"
            />
            {o.text}
          </label>
        ))}
      </div>
      <SaveStatus status={status} />
    </div>
  );
}

function FileAnswerField({
  assignmentId,
  questionId,
  existingFileName,
  existingFileUrl,
  disabled,
}: {
  assignmentId: string;
  questionId: string;
  existingFileName: string | null;
  existingFileUrl: string | null;
  disabled: boolean;
}) {
  const [state, action, pending] = useActionState(saveFileAnswer, undefined);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="questionId" value={questionId} />
      {existingFileUrl && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Current file:{" "}
          <a href={existingFileUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline dark:text-brand-400">
            {existingFileName}
          </a>
        </p>
      )}
      {!disabled && <input type="file" name="file" className="block text-sm" />}
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      {!disabled && (
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Uploading…" : "Upload"}
        </Button>
      )}
    </form>
  );
}

export function TakeTestForm({ assignmentId, questions, disabled }: { assignmentId: string; questions: Question[]; disabled: boolean }) {
  const [state, action, pending] = useActionState(submitTest, undefined);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <Card key={q.id}>
          <p className="text-sm font-medium">
            Q{i + 1}. {q.prompt}{" "}
            <span className="font-normal text-black/50 dark:text-white/50">
              ({q.maxMarks} pt{q.maxMarks === 1 ? "" : "s"})
            </span>
          </p>
          <div className="mt-3">
            {q.type === "MULTIPLE_CHOICE" && (
              <McqField
                assignmentId={assignmentId}
                questionId={q.id}
                options={q.options}
                defaultSelectedId={q.answer?.selectedOptionId ?? null}
                disabled={disabled}
              />
            )}
            {(q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") && (
              <TextAnswerField
                assignmentId={assignmentId}
                questionId={q.id}
                defaultValue={q.answer?.textAnswer ?? ""}
                rows={q.type === "LONG_ANSWER" ? 6 : 2}
                disabled={disabled}
              />
            )}
            {q.type === "FILE_UPLOAD" && (
              <FileAnswerField
                assignmentId={assignmentId}
                questionId={q.id}
                existingFileName={q.answer?.fileName ?? null}
                existingFileUrl={q.answer?.fileUrl ?? null}
                disabled={disabled}
              />
            )}
          </div>
        </Card>
      ))}

      {!disabled && (
        <Card>
          {!confirmOpen ? (
            <Button onClick={() => setConfirmOpen(true)}>Submit test</Button>
          ) : (
            <form action={action} className="space-y-2">
              <input type="hidden" name="assignmentId" value={assignmentId} />
              <p className="text-sm font-medium">Once submitted, you can&apos;t change your answers. Submit now?</p>
              {state?.message && (
                <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
                  {state.message}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Submitting…" : "Yes, submit"}
                </Button>
                <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
