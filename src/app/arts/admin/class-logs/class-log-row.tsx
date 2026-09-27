"use client";

import { useState } from "react";
import type { Booking, User } from "@prisma/client";
import { Badge, Button } from "@/components/ui";

export function ClassLogRow({ booking }: { booking: Booking & { student: User; professor: User } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-black/5 py-4 last:border-0 dark:border-white/5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-medium">
            {booking.student.name} &amp; {booking.professor.name}
          </div>
          <div className="text-sm text-black/50 dark:text-white/50">
            {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(booking.startAt)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {booking.aiSummary ? (
            <Badge tone="success">Summarized</Badge>
          ) : (
            <Badge tone="default">No summary yet</Badge>
          )}
          <Button variant="secondary" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide details" : "View details"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 space-y-4 rounded-lg bg-black/5 p-4 text-sm dark:bg-white/5">
          {booking.aiSummary ? (
            <div>
              <h4 className="font-semibold text-black/70 dark:text-white/70">AI summary</h4>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-black/80 dark:text-white/80">
                {booking.aiSummary}
              </pre>
            </div>
          ) : (
            <p className="text-black/50 dark:text-white/50">No AI summary is available for this session.</p>
          )}
          {booking.transcript && (
            <div>
              <h4 className="font-semibold text-black/70 dark:text-white/70">Full transcript</h4>
              <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap text-black/60 dark:text-white/60">
                {booking.transcript}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
