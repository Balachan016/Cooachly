"use client";

import { useActionState, useState } from "react";
import { sendAccountInvite } from "@/actions/invites";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { Site } from "@prisma/client";

export function InviteAdminForm() {
  const [state, formAction, pending] = useActionState(sendAccountInvite, undefined);
  const [site, setSite] = useState<Site>("COOACHLY");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="role" value="ADMIN" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="invite-admin-name">Full name</Label>
          <Input id="invite-admin-name" name="name" placeholder="Jane Doe" required />
        </div>
        <div>
          <Label htmlFor="invite-admin-email">Email</Label>
          <Input id="invite-admin-email" name="email" type="email" placeholder="jane@example.com" required />
        </div>
        <div>
          <Label htmlFor="invite-admin-phone">Phone (optional, for WhatsApp)</Label>
          <Input id="invite-admin-phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <Label>Site</Label>
          <Select name="site" value={site} onChange={(e) => setSite(e.target.value as Site)}>
            <option value="COOACHLY">Cooachly</option>
            <option value="ARTS">Cooachly Arts</option>
          </Select>
        </div>
      </div>
      <div>
        <Label htmlFor="invite-admin-message">Welcome message (optional)</Label>
        <Textarea
          id="invite-admin-message"
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
        {pending ? "Sending…" : "Send admin invite"}
      </Button>
    </form>
  );
}
