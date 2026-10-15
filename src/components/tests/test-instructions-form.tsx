"use client";

import { useActionState, useState } from "react";
import { updateTestInstructions } from "@/actions/tests";
import { Button, Label, Textarea } from "@/components/ui";

export function TestInstructionsForm({
  testId,
  currentInstructions,
  currentFormulaSheet,
}: {
  testId: string;
  currentInstructions: string | null;
  currentFormulaSheet: string | null;
}) {
  const [state, action, pending] = useActionState(updateTestInstructions, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {currentInstructions || currentFormulaSheet ? "Edit instructions / formula sheet" : "Add instructions / formula sheet"}
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="testId" value={testId} />
      <div>
        <Label htmlFor={`instructions-${testId}`}>Instructions</Label>
        <Textarea
          id={`instructions-${testId}`}
          name="instructions"
          rows={4}
          defaultValue={currentInstructions ?? ""}
          placeholder="Shown to the student before they start the test…"
        />
      </div>
      <div>
        <Label htmlFor={`formula-sheet-${testId}`}>Formula sheet</Label>
        <Textarea
          id={`formula-sheet-${testId}`}
          name="formulaSheet"
          rows={4}
          defaultValue={currentFormulaSheet ?? ""}
          placeholder="Reference formulas shown alongside the instructions…"
        />
      </div>
      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => setOpen(false)}>
          Never mind
        </Button>
      </div>
    </form>
  );
}
