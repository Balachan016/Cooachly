"use client";

import { useActionState } from "react";
import { updateContactInfo } from "@/actions/profile";
import { Button, FormMessage, Input, Label, Select } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

export function ContactInfoForm({ timezone, phone }: { timezone: string; phone: string | null }) {
  const [state, action, pending] = useActionState(updateContactInfo, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="timezone">Your timezone</Label>
        <Select id="timezone" name="timezone" defaultValue={timezone} required>
          {!TIMEZONES.includes(timezone) && <option value={timezone}>{timezone}</option>}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="phone">Phone (for SMS/WhatsApp reminders)</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={phone ?? ""} placeholder="+1 555 123 4567" />
      </div>
      {state?.message && <FormMessage>{state.message}</FormMessage>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save contact info"}
      </Button>
    </form>
  );
}
