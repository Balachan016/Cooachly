"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { fetchDemoSlots, submitDemoBooking } from "@/actions/demo";
import { Button, FormMessage, Input, Label, Select } from "@/components/ui";

type DayGroup = {
  day: string;
  times: { startAt: string; label: string; professorId: string; professorName: string }[];
};

export function DemoBookingForm({ subjects }: { subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] ?? "");
  const [groups, setGroups] = useState<DayGroup[]>([]);
  const [isLoadingSlots, startSlotsTransition] = useTransition();
  const [selected, setSelected] = useState<{ startAt: string; professorId: string } | null>(null);
  const [timezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  });

  const [state, formAction, pending] = useActionState(submitDemoBooking, undefined);

  useEffect(() => {
    startSlotsTransition(async () => {
      const result = await fetchDemoSlots(subject, timezone);
      setGroups(result);
    });
  }, [subject, timezone]);

  function handleSubjectChange(value: string) {
    setSubject(value);
    setSelected(null);
  }

  if (state?.success) {
    return <p className="text-black/70 dark:text-white/70">{state.message}</p>;
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="timezone" value={timezone} />
      <input type="hidden" name="subject" value={subject} />
      <input type="hidden" name="professorId" value={selected?.professorId ?? ""} />
      <input type="hidden" name="startAt" value={selected?.startAt ?? ""} />

      <div>
        <Label htmlFor="subject">Subject</Label>
        <Select id="subject" value={subject} onChange={(e) => handleSubjectChange(e.target.value)} required>
          {subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Pick a time ({timezone})</Label>
        {isLoadingSlots ? (
          <p className="text-sm text-black/50 dark:text-white/50">Loading available times…</p>
        ) : groups.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">No demo slots available for this subject in the next two weeks.</p>
        ) : (
          <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
            {groups.map((group) => (
              <div key={group.day}>
                <div className="mb-2 text-sm font-medium">{group.day}</div>
                <div className="flex flex-wrap gap-2">
                  {group.times.map((t) => (
                    <button
                      type="button"
                      key={`${t.professorId}-${t.startAt}`}
                      onClick={() => setSelected({ startAt: t.startAt, professorId: t.professorId })}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        selected?.startAt === t.startAt && selected.professorId === t.professorId
                          ? "border-green-700 bg-green-700 text-white"
                          : "border-black/15 hover:border-green-400 dark:border-white/15"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
        <Label htmlFor="phone">Phone (optional, for WhatsApp confirmation)</Label>
        <Input id="phone" name="phone" type="tel" placeholder="+1 555 123 4567" />
      </div>

      {state?.message && <FormMessage>{state.message}</FormMessage>}

      <Button type="submit" disabled={!selected || pending} className="w-full">
        {pending ? "Booking…" : "Book my free demo"}
      </Button>
    </form>
  );
}
