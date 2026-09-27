"use client";

import { useActionState, useState } from "react";
import { redeemAccountInvite } from "@/actions/invites";
import { Button, FormMessage, Input, Label, Select } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

export function RegisterInviteForm({ token }: { token: string }) {
  const action = redeemAccountInvite.bind(null, token);
  const [state, formAction, pending] = useActionState(action, undefined);
  const [detectedTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="phone">Phone (optional, for WhatsApp reminders)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
      </div>
      <div>
        <Label htmlFor="timezone">Your timezone</Label>
        <Select id="timezone" name="timezone" defaultValue={detectedTimezone} required>
          {!TIMEZONES.includes(detectedTimezone) && (
            <option value={detectedTimezone}>{detectedTimezone}</option>
          )}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating your login…" : "Create my login"}
      </Button>
    </form>
  );
}
