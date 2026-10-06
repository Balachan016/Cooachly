"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addQuestion } from "@/actions/tests";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "MULTIPLE_CHOICE", label: "Multiple choice" },
  { value: "SHORT_ANSWER", label: "Short answer" },
  { value: "LONG_ANSWER", label: "Long answer" },
  { value: "FILE_UPLOAD", label: "File upload" },
];

export function AddQuestionForm({ testId }: { testId: string }) {
  const [state, action, pending] = useActionState(addQuestion, undefined);
  const [type, setType] = useState("MULTIPLE_CHOICE");
  const [optionCount, setOptionCount] = useState(4);
  const formRef = useRef<HTMLFormElement>(null);

  // Clearing the uncontrolled inputs (prompt/points/options) is a DOM
  // operation, so it belongs in an effect; resetting the controlled `type`/
  // `optionCount` state happens during render below instead, since setState
  // inside an effect body is what the lint rule (rightly) objects to.
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.success) {
      setType("MULTIPLE_CHOICE");
      setOptionCount(4);
    }
  }

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input type="hidden" name="testId" value={testId} />
      <p className="text-sm font-medium">Add a question</p>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <div>
          <Label htmlFor="prompt">Question</Label>
          <Textarea id="prompt" name="prompt" rows={2} required placeholder="Type the question…" />
        </div>
        <div>
          <Label htmlFor="maxMarks">Points</Label>
          <Input id="maxMarks" name="maxMarks" type="number" min={1} defaultValue={1} required />
        </div>
      </div>
      <div>
        <Label htmlFor="type">Answer type</Label>
        <Select id="type" name="type" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      {type === "MULTIPLE_CHOICE" && (
        <div className="space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/10">
          <p className="text-xs font-medium text-black/60 dark:text-white/60">Options — pick the correct one</p>
          {Array.from({ length: optionCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correctOption" value={i} required className="h-4 w-4 shrink-0" />
              <Input name="optionText" placeholder={`Option ${i + 1}`} required />
            </div>
          ))}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setOptionCount((n) => n + 1)}>
              Add option
            </Button>
            {optionCount > 2 && (
              <Button type="button" variant="secondary" onClick={() => setOptionCount((n) => n - 1)}>
                Remove last
              </Button>
            )}
          </div>
        </div>
      )}

      {type !== "MULTIPLE_CHOICE" && (
        <div>
          <Label htmlFor="modelAnswer">Model answer (optional)</Label>
          <Textarea
            id="modelAnswer"
            name="modelAnswer"
            rows={2}
            placeholder="Shown to the student alongside their own answer once you share their score, so they can see what a correct answer looks like."
          />
        </div>
      )}

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add question"}
      </Button>
    </form>
  );
}
