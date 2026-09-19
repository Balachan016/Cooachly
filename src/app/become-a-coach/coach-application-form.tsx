"use client";

import { useActionState } from "react";
import { submitCoachApplication } from "@/actions/coach-applications";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";
import { CURRICULUM_OPTIONS } from "@/lib/curricula";

export function CoachApplicationForm() {
  const [state, formAction, pending] = useActionState(submitCoachApplication, undefined);

  if (state?.success) {
    return <p className="text-black/70 dark:text-white/70">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
      </div>
      <div>
        <Label htmlFor="subject">Subject(s) you teach</Label>
        <Input id="subject" name="subject" placeholder="e.g. Mathematics, Physics" required />
      </div>
      <div>
        <Label>Curricula you&apos;re familiar with (optional)</Label>
        <div className="flex flex-wrap gap-3">
          {CURRICULUM_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
              <input
                type="checkbox"
                name="curricula"
                value={option}
                className="h-4 w-4 rounded border-black/20 text-green-700 focus:ring-green-600 dark:border-white/20"
              />
              {option}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="yearsExperience">Years of teaching experience (optional)</Label>
        <Input id="yearsExperience" name="yearsExperience" type="number" min={0} step={1} />
      </div>
      <div>
        <Label htmlFor="qualifications">Your background and qualifications</Label>
        <Textarea
          id="qualifications"
          name="qualifications"
          rows={4}
          placeholder="Degrees, certifications, prior teaching or tutoring experience…"
          required
        />
      </div>
      <div>
        <Label htmlFor="availability">Availability (optional)</Label>
        <Input id="availability" name="availability" placeholder="e.g. Weekday evenings, weekends" />
      </div>
      <div>
        <Label htmlFor="message">Anything else? (optional)</Label>
        <Textarea id="message" name="message" rows={3} />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
