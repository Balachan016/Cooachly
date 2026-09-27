"use client";

import { useActionState } from "react";
import { submitCoachApplication } from "@/actions/coach-applications";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";
import { ARTS_LEVEL_OPTIONS } from "@/lib/curricula";

export function CoachApplicationForm() {
  const [state, formAction, pending] = useActionState(submitCoachApplication, undefined);

  if (state?.success) {
    return <p className="text-black/70 dark:text-white/70">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="site" value="ARTS" />
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
        <Label htmlFor="subject">What do you teach?</Label>
        <Input id="subject" name="subject" placeholder="e.g. Carnatic vocals, Geethams & Varnams" required />
      </div>
      <div>
        <Label>Levels you&apos;re comfortable teaching (optional)</Label>
        <div className="flex flex-wrap gap-3">
          {ARTS_LEVEL_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
              <input
                type="checkbox"
                name="curricula"
                value={option}
                className="h-4 w-4 rounded border-black/20 text-brand-700 focus:ring-brand-600 dark:border-white/20"
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
        <Label htmlFor="qualifications">Your background and training lineage</Label>
        <Textarea
          id="qualifications"
          name="qualifications"
          rows={4}
          placeholder="Guru parampara, certifications/degrees, performance and prior teaching experience…"
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
