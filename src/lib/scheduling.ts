import "server-only";
import { addDays, addMinutes, isBefore, startOfDay } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";

export const SESSION_LENGTH_MINUTES = 60;
export const BOOKING_WINDOW_DAYS = 14;

export type AvailableSlot = {
  startAt: Date;
  endAt: Date;
  sessionLengthMinutes: number;
  booked: boolean;
};

/**
 * Expands a professor's recurring weekly availability into concrete UTC
 * slots over the next BOOKING_WINDOW_DAYS days. Unlike getAvailableSlots,
 * this keeps slots that overlap an existing booking (tagged `booked: true`)
 * instead of dropping them, so a calendar UI can still show — and disable —
 * a time another student already took.
 */
export async function getSlotsWithStatus(
  professorId: string,
  opts: { sessionLengthOverride?: number } = {}
): Promise<AvailableSlot[]> {
  const [availabilities, bookings] = await Promise.all([
    prisma.availability.findMany({
      where: { professorId, isActive: true },
    }),
    prisma.booking.findMany({
      where: {
        professorId,
        status: { in: ["PENDING", "CONFIRMED"] },
        startAt: { gte: new Date() },
      },
      select: { startAt: true, endAt: true },
    }),
  ]);

  const now = new Date();
  const windowEnd = addDays(now, BOOKING_WINDOW_DAYS);
  const slots: AvailableSlot[] = [];

  for (let cursor = startOfDay(now); isBefore(cursor, windowEnd); cursor = addDays(cursor, 1)) {
    const dayOfWeek = cursor.getDay();
    const dayAvailabilities = availabilities.filter((a) => a.dayOfWeek === dayOfWeek);

    for (const availability of dayAvailabilities) {
      const dateStr = formatDateOnly(cursor);
      const rangeStart = fromZonedTime(`${dateStr}T${availability.startTime}:00`, availability.timezone);
      const rangeEnd = fromZonedTime(`${dateStr}T${availability.endTime}:00`, availability.timezone);
      const length = opts.sessionLengthOverride ?? availability.sessionLengthMinutes;

      for (
        let slotStart = rangeStart;
        isBefore(addMinutes(slotStart, length), addMinutes(rangeEnd, 1));
        slotStart = addMinutes(slotStart, length)
      ) {
        const slotEnd = addMinutes(slotStart, length);

        if (isBefore(slotStart, now)) continue;

        const booked = bookings.some((b) => isBefore(slotStart, b.endAt) && isBefore(b.startAt, slotEnd));
        slots.push({ startAt: slotStart, endAt: slotEnd, sessionLengthMinutes: length, booked });
      }
    }
  }

  slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return slots;
}

/** Only the slots a student could actually book right now. */
export async function getAvailableSlots(
  professorId: string,
  opts: { sessionLengthOverride?: number } = {}
): Promise<AvailableSlot[]> {
  const slots = await getSlotsWithStatus(professorId, opts);
  return slots.filter((s) => !s.booked);
}

export type CalendarSlot = { startAt: string; label: string; booked: boolean };
export type CalendarDay = {
  dateKey: string;
  dayNumber: number;
  monthLabel: string;
  weekdayIndex: number;
  slots: CalendarSlot[];
};

const WEEKDAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Lays out the booking window as calendar weeks (Sun–Sat rows), padded with
 * null cells so the grid aligns, for a visual month/week-style picker.
 */
export function buildCalendarWeeks(slots: AvailableSlot[], timezone: string, windowDays: number): (CalendarDay | null)[][] {
  const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" });
  const partsFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    day: "numeric",
    month: "short",
  });

  const slotsByDate = new Map<string, CalendarSlot[]>();
  for (const slot of slots) {
    const dateKey = dateKeyFormatter.format(slot.startAt);
    const list = slotsByDate.get(dateKey) ?? [];
    list.push({
      startAt: slot.startAt.toISOString(),
      label: `${timeFormatter.format(slot.startAt)} – ${timeFormatter.format(slot.endAt)}`,
      booked: slot.booked,
    });
    slotsByDate.set(dateKey, list);
  }

  const now = new Date();
  const days: CalendarDay[] = [];
  for (let i = 0; i < windowDays; i++) {
    const candidate = addDays(now, i);
    const dateKey = dateKeyFormatter.format(candidate);
    const parts = partsFormatter.formatToParts(candidate);
    const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sunday";
    const dayNumber = Number(parts.find((p) => p.type === "day")?.value ?? "1");
    const monthLabel = parts.find((p) => p.type === "month")?.value ?? "";

    days.push({
      dateKey,
      dayNumber,
      monthLabel,
      weekdayIndex: WEEKDAY_ORDER.indexOf(weekday),
      slots: (slotsByDate.get(dateKey) ?? []).sort((a, b) => a.startAt.localeCompare(b.startAt)),
    });
  }

  const leadingBlanks = days.length ? days[0].weekdayIndex : 0;
  const padded: (CalendarDay | null)[] = [...Array(leadingBlanks).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);

  const weeks: (CalendarDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
  return weeks;
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
