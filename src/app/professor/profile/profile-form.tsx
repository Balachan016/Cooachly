"use client";

import { useActionState } from "react";
import type { ProfessorProfile } from "@prisma/client";
import { updateProfessorProfile } from "@/actions/profile";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";

export function ProfileForm({ profile }: { profile: ProfessorProfile | null }) {
  const [state, action, pending] = useActionState(updateProfessorProfile, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="headline">Headline</Label>
        <Input id="headline" name="headline" defaultValue={profile?.headline ?? ""} placeholder="Ex-Google SWE • Interview coach" />
      </div>
      <div>
        <Label htmlFor="subject">Subject / specialty</Label>
        <Input id="subject" name="subject" defaultValue={profile?.subject ?? ""} placeholder="Software engineering interviews" />
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" name="bio" rows={5} defaultValue={profile?.bio ?? ""} placeholder="Tell students about your background…" />
      </div>
      <div>
        <Label htmlFor="hourlyRateCents">Price per session (USD)</Label>
        <Input
          id="hourlyRateCents"
          type="number"
          min={0}
          step={1}
          defaultValue={profile ? profile.hourlyRateCents / 100 : 50}
          onChange={(e) => {
            const hidden = document.getElementById("hourlyRateCentsHidden") as HTMLInputElement | null;
            if (hidden) hidden.value = String(Math.round(Number(e.target.value) * 100));
          }}
        />
        <input type="hidden" id="hourlyRateCentsHidden" name="hourlyRateCents" defaultValue={profile?.hourlyRateCents ?? 5000} />
      </div>
      <div>
        <Label htmlFor="monthlyPriceCents">Monthly subscription price (USD, optional)</Label>
        <Input
          id="monthlyPriceCents"
          type="number"
          min={0}
          step={1}
          defaultValue={profile?.monthlyPriceCents ? profile.monthlyPriceCents / 100 : ""}
          placeholder="Leave blank to disable subscriptions"
          onChange={(e) => {
            const hidden = document.getElementById("monthlyPriceCentsHidden") as HTMLInputElement | null;
            if (hidden) hidden.value = e.target.value ? String(Math.round(Number(e.target.value) * 100)) : "";
          }}
        />
        <input
          type="hidden"
          id="monthlyPriceCentsHidden"
          name="monthlyPriceCents"
          defaultValue={profile?.monthlyPriceCents ?? ""}
        />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
