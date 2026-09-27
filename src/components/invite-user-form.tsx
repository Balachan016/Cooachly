"use client";

import { useActionState, useState } from "react";
import { sendAccountInvite } from "@/actions/invites";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(sendAccountInvite, undefined);
  const [role, setRole] = useState<"STUDENT" | "PROFESSOR">("STUDENT");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="role" value={role} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="invite-name">Full name</Label>
          <Input id="invite-name" name="name" placeholder="Jane Doe" required />
        </div>
        <div>
          <Label htmlFor="invite-email">Email</Label>
          <Input id="invite-email" name="email" type="email" placeholder="jane@example.com" required />
        </div>
        <div>
          <Label htmlFor="invite-phone">Phone (optional, for WhatsApp)</Label>
          <Input id="invite-phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <Label>Role</Label>
          <Select value={role} onChange={(e) => setRole(e.target.value as "STUDENT" | "PROFESSOR")}>
            <option value="STUDENT">Student</option>
            <option value="PROFESSOR">Professor</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="invite-message">Welcome message (optional)</Label>
        <Textarea
          id="invite-message"
          name="message"
          rows={3}
          placeholder="A personal note to include in the invite email…"
        />
      </div>

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send invite"}
      </Button>
    </form>
  );
}
