"use client";

import { useActionState, useState } from "react";
import { createAdminAccount } from "@/actions/admin";
import { Button, Input, Label, Select } from "@/components/ui";
import type { Site } from "@prisma/client";

export function CreateAdminForm() {
  const [state, formAction, pending] = useActionState(createAdminAccount, undefined);
  const [site, setSite] = useState<Site>("COOACHLY");

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="create-admin-name">Full name</Label>
          <Input id="create-admin-name" name="name" placeholder="Jane Doe" required />
        </div>
        <div>
          <Label htmlFor="create-admin-email">Email</Label>
          <Input id="create-admin-email" name="email" type="email" placeholder="jane@example.com" required />
        </div>
        <div>
          <Label htmlFor="create-admin-phone">Phone (optional)</Label>
          <Input id="create-admin-phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
        </div>
        <div>
          <Label>Site</Label>
          <Select name="site" value={site} onChange={(e) => setSite(e.target.value as Site)}>
            <option value="COOACHLY">Cooachly</option>
            <option value="ARTS">Cooachly Arts</option>
          </Select>
        </div>
      </div>

      <p className="text-xs text-black/50 dark:text-white/50">
        This creates the admin login immediately with a random password, and emails the login link
        and password to the address above.
      </p>

      {state?.message && (
        <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create admin login"}
      </Button>
    </form>
  );
}
