"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User, ProfessorProfile } from "@prisma/client";
import { updateUserDetailsAsAdmin } from "@/actions/admin";
import { Button, FormMessage, Input, Label, Select, Textarea } from "@/components/ui";
import { TIMEZONES } from "@/lib/roles";

export function EditUserForm({ user }: { user: User & { professorProfile: ProfessorProfile | null } }) {
  const router = useRouter();
  const action = updateUserDetailsAsAdmin.bind(null, user.id);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.success) {
      router.push("/admin/users");
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" defaultValue={user.name} required />
      </div>
      <div>
        <Label htmlFor="email">Email (login)</Label>
        <Input id="email" name="email" type="email" defaultValue={user.email} required />
      </div>
      <div>
        <Label htmlFor="phone">{user.role === "STUDENT" ? "Student WhatsApp Number" : "WhatsApp Number"}</Label>
        <Input id="phone" name="phone" type="tel" defaultValue={user.phone ?? ""} placeholder="+1 555 123 4567" />
      </div>

      {user.role === "STUDENT" && (
        <>
          <div>
            <Label htmlFor="parentName">Parent/Guardian Name</Label>
            <Input id="parentName" name="parentName" defaultValue={user.parentName ?? ""} />
          </div>
          <div>
            <Label htmlFor="parentPhone">Parent WhatsApp Number</Label>
            <Input id="parentPhone" name="parentPhone" type="tel" defaultValue={user.parentPhone ?? ""} placeholder="+1 555 123 4567" />
          </div>
        </>
      )}

      <div>
        <Label htmlFor="timezone">Timezone</Label>
        <Select id="timezone" name="timezone" defaultValue={user.timezone} required>
          {!TIMEZONES.includes(user.timezone) && <option value={user.timezone}>{user.timezone}</option>}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </Select>
      </div>

      {user.role === "PROFESSOR" && (
        <>
          <div className="border-t border-black/10 pt-4 dark:border-white/10">
            <p className="mb-3 text-sm font-medium text-black/70 dark:text-white/70">Public profile</p>
          </div>
          <div>
            <Label htmlFor="headline">Headline</Label>
            <Input id="headline" name="headline" defaultValue={user.professorProfile?.headline ?? ""} />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" defaultValue={user.professorProfile?.subject ?? ""} />
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea id="bio" name="bio" rows={4} defaultValue={user.professorProfile?.bio ?? ""} />
          </div>
          <div>
            <Label htmlFor="hourlyRateCents">Price per session (USD)</Label>
            <Input
              id="hourlyRateCents"
              type="number"
              min={0}
              step={1}
              defaultValue={user.professorProfile ? user.professorProfile.hourlyRateCents / 100 : 50}
              onChange={(e) => {
                const hidden = document.getElementById("hourlyRateCentsHidden") as HTMLInputElement | null;
                if (hidden) hidden.value = String(Math.round(Number(e.target.value) * 100));
              }}
            />
            <input
              type="hidden"
              id="hourlyRateCentsHidden"
              name="hourlyRateCents"
              defaultValue={user.professorProfile?.hourlyRateCents ?? 5000}
            />
          </div>
          <div>
            <Label htmlFor="monthlyPriceCents">Monthly subscription price (USD, optional)</Label>
            <Input
              id="monthlyPriceCents"
              type="number"
              min={0}
              step={1}
              defaultValue={user.professorProfile?.monthlyPriceCents ? user.professorProfile.monthlyPriceCents / 100 : ""}
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
              defaultValue={user.professorProfile?.monthlyPriceCents ?? ""}
            />
          </div>
        </>
      )}

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
