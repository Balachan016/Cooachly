"use client";

import { useActionState } from "react";
import type { ProfessorProfile } from "@prisma/client";
import { updateProfessorProfile } from "@/actions/profile";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";
import { ARTS_LEVEL_OPTIONS } from "@/lib/curricula";

export function ProfileForm({ profile }: { profile: ProfessorProfile | null }) {
  const [state, action, pending] = useActionState(updateProfessorProfile, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="headline">Headline</Label>
        <Input id="headline" name="headline" defaultValue={profile?.headline ?? ""} placeholder="Trained in the Semmangudi bani • 15 years teaching" />
      </div>
      <div>
        <Label htmlFor="subject">Subject / specialty</Label>
        <Input id="subject" name="subject" defaultValue={profile?.subject ?? ""} placeholder="Carnatic Vocals" />
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          name="bio"
          rows={5}
          defaultValue={profile?.bio ?? ""}
          placeholder="Tell students about your training and teaching style. This is also the best place to mention your class rate, since Cooachly Arts doesn't set pricing for you — you discuss and collect payment directly with each student."
        />
      </div>
      <div>
        <Label>Levels you teach</Label>
        <div className="flex flex-wrap gap-3">
          {ARTS_LEVEL_OPTIONS.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm text-black/70 dark:text-white/70">
              <input
                type="checkbox"
                name="curricula"
                value={option}
                defaultChecked={profile?.curricula?.includes(option)}
                className="h-4 w-4 rounded border-black/20 text-brand-700 focus:ring-brand-600 dark:border-white/20"
              />
              {option}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-black/40 dark:text-white/40">
          Helps students filter for gurus who teach their level.
        </p>
      </div>
      <input type="hidden" name="hourlyRateCents" value="0" />

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
