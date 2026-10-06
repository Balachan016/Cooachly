"use client";

import { useActionState, useState } from "react";
import { submitDemoRequest } from "@/actions/demo";
import { Button, FormMessage, Input, Label } from "@/components/ui";
import type { Site } from "@prisma/client";

export function DemoBookingForm({ site }: { site: Site }) {
  const [state, formAction, pending] = useActionState(submitDemoRequest, undefined);
  const [timezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });

  if (state?.success) {
    return <p className="text-black/70 dark:text-white/70">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="site" value={site} />
      <input type="hidden" name="timezone" value={timezone} />

      <div>
        <Label htmlFor="subject">What would you like a demo for?</Label>
        <Input id="subject" name="subject" placeholder="e.g. AP Calculus, Carnatic Vocals" required />
      </div>
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="phone">Phone (optional, for WhatsApp updates)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
      </div>
      <div>
        <Label htmlFor="referredBy">How did you hear about us? (optional)</Label>
        <Input id="referredBy" name="referredBy" placeholder="e.g. a friend's name, Google, Instagram" />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Request my free demo"}
      </Button>
    </form>
  );
}
