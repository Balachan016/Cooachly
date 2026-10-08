import "server-only";

export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  status?: "CONFIRMED" | "CANCELLED";
  /** Bump when re-sending an update for the same UID so calendar apps know to replace the old entry. */
  sequence?: number;
};

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/**
 * A minimal RFC 5545 VCALENDAR with one VEVENT per booking, attachable to
 * confirmation/reschedule/cancellation emails so recipients can add (or, for
 * CANCEL, remove) the session on whatever calendar app they use — no Google
 * OAuth or external API needed.
 */
export function buildIcsCalendar(events: IcsEvent[], opts: { method?: "PUBLISH" | "CANCEL" } = {}): string {
  const method = opts.method ?? "PUBLISH";
  const now = formatIcsDate(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Cooachly//Booking//EN", `METHOD:${method}`, "CALSCALE:GREGORIAN"];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(event.start)}`,
      `DTEND:${formatIcsDate(event.end)}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeIcsText(event.description)}`] : []),
      ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
      `STATUS:${event.status ?? "CONFIRMED"}`,
      `SEQUENCE:${event.sequence ?? 0}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function icsBookingUid(bookingId: string): string {
  return `booking-${bookingId}@cooachly`;
}

export function googleCalendarLink(event: { start: Date; end: Date; summary: string; description?: string; location?: string }): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.summary,
    dates: `${formatIcsDate(event.start)}/${formatIcsDate(event.end)}`,
  });
  if (event.description) params.set("details", event.description);
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
