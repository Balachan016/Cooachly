"use client";

import { useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";

/**
 * Shown before a student's test questions (and before the timer starts
 * ticking, since that only happens once TestTimer/TakeTestForm actually
 * mount) when the test has instructions and/or a formula sheet attached.
 * Skipped entirely if there's nothing to show, or if the student has
 * already started this attempt — returning to an in-progress test goes
 * straight back to the questions, not back through the intro.
 */
export function TestIntroGate({
  instructions,
  formulaSheet,
  durationMinutes,
  alreadyStarted,
  children,
}: {
  instructions: string | null;
  formulaSheet: string | null;
  durationMinutes: number;
  alreadyStarted: boolean;
  children: ReactNode;
}) {
  const hasIntro = Boolean(instructions || formulaSheet);
  const [started, setStarted] = useState(!hasIntro || alreadyStarted);

  if (started) return <>{children}</>;

  return (
    <Card>
      <h2 className="text-lg font-semibold">Before you begin</h2>
      {instructions && (
        <div className="mt-3">
          <h3 className="text-xs font-semibold uppercase text-black/50 dark:text-white/50">Instructions</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">{instructions}</p>
        </div>
      )}
      {formulaSheet && (
        <div className="mt-4">
          <h3 className="text-xs font-semibold uppercase text-black/50 dark:text-white/50">Formula sheet</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">{formulaSheet}</p>
        </div>
      )}
      <p className="mt-4 text-xs text-black/50 dark:text-white/50">
        Your {durationMinutes}-minute timer starts once you begin — take your time reading the above first.
      </p>
      <Button className="mt-3" onClick={() => setStarted(true)}>
        Start test
      </Button>
    </Card>
  );
}
