"use client";

import { useActionState, useRef } from "react";
import { submitEnquiry } from "@/actions/enquiries";
import { Button, FormMessage, Input, Label, Textarea } from "@/components/ui";

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitEnquiry, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  if (state?.success) {
    return <p className="text-black/70 dark:text-white/70">{state.message}</p>;
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
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
        <Label htmlFor="country">Country (optional)</Label>
        <Input id="country" name="country" placeholder="e.g. United States" />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={4} required />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
