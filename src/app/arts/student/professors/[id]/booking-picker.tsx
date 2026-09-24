"use client";

import { useActionState, useState } from "react";
import { bookSlot } from "@/actions/bookings";
import { Button, FormMessage } from "@/components/ui";

type DayGroup = { day: string; times: { startAt: string; label: string }[] };

export function BookingPicker({ professorId, groups, timezone }: { professorId: string; groups: DayGroup[]; timezone: string }) {
  const [state, action, pending] = useActionState(bookSlot, undefined);
  const [selected, setSelected] = useState<string | null>(null);

  if (groups.length === 0) {
    return <p className="text-sm text-black/50 dark:text-white/50">No open slots in the next two weeks.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="professorId" value={professorId} />
      <input type="hidden" name="startAt" value={selected ?? ""} />

      <p className="text-xs text-black/50 dark:text-white/50">All times shown in your timezone ({timezone}).</p>

      <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
        {groups.map((group) => (
          <div key={group.day}>
            <div className="mb-2 text-sm font-medium">{group.day}</div>
            <div className="flex flex-wrap gap-2">
              {group.times.map((t) => (
                <button
                  type="button"
                  key={t.startAt}
                  onClick={() => setSelected(t.startAt)}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${
                    selected === t.startAt
                      ? "border-brand-700 bg-brand-700 text-white"
                      : "border-black/15 hover:border-brand-400 dark:border-white/15"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={!selected || pending} className="w-full">
        {pending ? "Booking…" : "Book class"}
      </Button>
    </form>
  );
}
