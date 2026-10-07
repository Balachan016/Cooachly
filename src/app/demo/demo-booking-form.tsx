"use client";

import { useActionState, useState } from "react";
import { submitDemoRequest } from "@/actions/demo";
import { Button, FormMessage, Input, Label, Select } from "@/components/ui";
import { DEMO_SUBJECT_OPTIONS, DEMO_SUBJECT_OTHER } from "@/lib/demo-subjects";
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
  const [subject, setSubject] = useState("");

  if (state?.success) {
    return <p className="text-black/70 dark:text-white/70">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="site" value={site} />
      <input type="hidden" name="timezone" value={timezone} />

      <div>
        <Label htmlFor="subject">What would you like a demo for?</Label>
        <Select id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required>
          <option value="" disabled>
            Select a subject
          </option>
          {DEMO_SUBJECT_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
          <option value={DEMO_SUBJECT_OTHER}>{DEMO_SUBJECT_OTHER}</option>
        </Select>
        {subject === DEMO_SUBJECT_OTHER && (
          <Input
            name="subjectOther"
            placeholder="Tell us what subject"
            required
            className="mt-2"
          />
        )}
      </div>
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="grade">Grade</Label>
        <Input id="grade" name="grade" placeholder="e.g. 10th grade" required />
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
