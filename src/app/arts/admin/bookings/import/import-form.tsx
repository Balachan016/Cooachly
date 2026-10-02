"use client";

import { useActionState } from "react";
import { importBookingSchedule } from "@/actions/schedule-import";
import { Button, Textarea } from "@/components/ui";

export function ScheduleImportForm({ defaultCsv = "" }: { defaultCsv?: string }) {
  const [state, formAction, pending] = useActionState(importBookingSchedule, undefined);

  return (
    <form action={formAction}>
      <Textarea name="csv" rows={14} defaultValue={defaultCsv} className="font-mono text-xs" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Importing…" : "Import schedule"}
        </Button>
        {state?.message && (
          <p className={`text-sm ${state.success ? "text-brand-700 dark:text-brand-400" : "text-red-600 dark:text-red-400"}`}>
            {state.message}
          </p>
        )}
      </div>

      {state?.results && state.results.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-black/10 text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="py-2 pr-3">Line</th>
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Professor</th>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {state.results.map((r) => (
                <tr key={r.line} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="py-2 pr-3">{r.line}</td>
                  <td className="py-2 pr-3">{r.student}</td>
                  <td className="py-2 pr-3">{r.professor}</td>
                  <td className="whitespace-nowrap py-2 pr-3">{r.when}</td>
                  <td className="py-2 pr-3">
                    <span className={r.status === "created" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2">{r.reason ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  );
}
