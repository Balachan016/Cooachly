"use client";

import { useState } from "react";
import type { Booking, CallAttendanceEvent, User } from "@prisma/client";
import { Badge, Button } from "@/components/ui";

type AttendanceEvent = CallAttendanceEvent & { user: User | null };

function attendanceLabel(event: AttendanceEvent): string {
  if (event.user) return `${event.user.name} (${event.user.role.toLowerCase()})`;
  return event.participantName ? `${event.participantName} (unidentified)` : "Unidentified participant";
}

/** Groups a booking's raw join/leave events by person — by user id when known, else by the free-text name Daily collected. */
function groupAttendance(events: AttendanceEvent[]) {
  const groups = new Map<string, { label: string; events: AttendanceEvent[] }>();
  for (const event of events) {
    const key = event.userId ?? `name:${event.participantName ?? "unknown"}`;
    const group = groups.get(key) ?? { label: attendanceLabel(event), events: [] };
    group.events.push(event);
    groups.set(key, group);
  }
  // Whoever joined first (e.g. usually the professor) listed first.
  return [...groups.values()].sort((a, b) => a.events[0].occurredAt.getTime() - b.events[0].occurredAt.getTime());
}

export function ClassLogRow({
  booking,
  viewerTimezone,
}: {
  booking: Booking & { student: User; professor: User; callAttendanceEvents: AttendanceEvent[] };
  viewerTimezone: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const attendanceGroups = groupAttendance(booking.callAttendanceEvents);
  const timeFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: viewerTimezone });

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

          <div>
            <h4 className="font-semibold text-black/70 dark:text-white/70">Attendance (join/leave)</h4>
            {attendanceGroups.length === 0 ? (
              <p className="mt-1 text-black/50 dark:text-white/50">
                No join/leave activity recorded for this call yet.
              </p>
            ) : (
              <div className="mt-2 space-y-3">
                {attendanceGroups.map((group, i) => {
                  const joinCount = group.events.filter((e) => e.eventType === "JOINED").length;
                  const leaveCount = group.events.filter((e) => e.eventType === "LEFT").length;
                  return (
                    <div key={i}>
                      <div className="font-medium text-black/80 dark:text-white/80">
                        {group.label} — {joinCount} join{joinCount === 1 ? "" : "s"}, {leaveCount} leave
                        {leaveCount === 1 ? "" : "s"}
                      </div>
                      <ul className="mt-1 space-y-0.5 text-black/60 dark:text-white/60">
                        {group.events.map((e) => (
                          <li key={e.id}>
                            {e.eventType === "JOINED" ? "Joined" : "Left"}: {timeFormatter.format(e.occurredAt)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
