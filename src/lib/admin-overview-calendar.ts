import "server-only";
import { addMinutes, isBefore } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { Site } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type OverviewEntry = {
  startAt: Date;
  timeLabel: string;
  status: "booked" | "available";
  professorName: string;
  studentName?: string;
};

export type OverviewDay = { dateKey: string; dayNumber: number; entries: OverviewEntry[] };
export type OverviewMonth = { monthLabel: string; weeks: (OverviewDay | null)[][] };

function dateKeyInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function timeLabelInZone(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(date);
}

/** Plain "YYYY-MM-DD" for a Date built from local (not UTC) y/m/d components — see scheduling.ts's identical helper. */
function localDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Builds a full Monday–Sunday calendar-month grid of every booking (actual,
 * regardless of whether it lines up with a registered Availability window —
 * e.g. an admin-created instant call) and every still-open Availability slot
 * across all of a site's professors, each entry labeled with names, for the
 * Admin Overview page. Unlike the student booking calendar
 * (scheduling.ts#getSlotsWithStatus), this covers the whole calendar month —
 * including past days — not a rolling window from "now". Every day/time is
 * bucketed and displayed in the viewer's own timezone, consistent with every
 * other admin-facing time display in this app.
 */
export async function buildAdminMonthOverview(site: Site, viewerTimezone: string, reference: Date = new Date()): Promise<OverviewMonth> {
  const zonedToday = new Intl.DateTimeFormat("en-CA", { timeZone: viewerTimezone, year: "numeric", month: "2-digit" }).format(reference);
  const [zonedYear, zonedMonth] = zonedToday.split("-").map(Number);
  const year = zonedYear;
  const month = zonedMonth - 1; // 0-indexed
  const monthStart = new Date(year, month, 1);
  const monthEndExclusive = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const professors = await prisma.user.findMany({
    where: { role: "PROFESSOR", site },
    select: { id: true, name: true, isActive: true },
    orderBy: { name: "asc" },
  });
  const professorIds = professors.map((p) => p.id);
  const professorById = new Map(professors.map((p) => [p.id, p]));

  const [availabilities, bookings] = await Promise.all([
    prisma.availability.findMany({ where: { professorId: { in: professorIds }, isActive: true } }),
    prisma.booking.findMany({
      where: { professorId: { in: professorIds }, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: monthStart, lt: monthEndExclusive } },
      select: { startAt: true, endAt: true, professorId: true, student: { select: { name: true } } },
    }),
  ]);

  const bookedEntries: OverviewEntry[] = bookings.map((b) => ({
    startAt: b.startAt,
    timeLabel: timeLabelInZone(b.startAt, viewerTimezone),
    status: "booked" as const,
    professorName: professorById.get(b.professorId)?.name ?? "—",
    studentName: b.student.name,
  }));

  // Every still-open Availability slot across the whole month (not just from
  // today on, since this is a complete monthly picture, not a booking
  // picker) — skipping any slot that overlaps an actual booking above.
  const availableEntries: OverviewEntry[] = [];
  for (const professor of professors) {
    if (!professor.isActive) continue;
    const profAvailabilities = availabilities.filter((a) => a.professorId === professor.id);
    if (profAvailabilities.length === 0) continue;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      const dateStr = localDateOnly(dayDate);
      const dayOfWeek = dayDate.getDay();
      const dayAvailabilities = profAvailabilities.filter((a) => (a.date ? localDateOnly(a.date) === dateStr : a.dayOfWeek === dayOfWeek));

      for (const availability of dayAvailabilities) {
        const rangeStart = fromZonedTime(`${dateStr}T${availability.startTime}:00`, availability.timezone);
        const rangeEnd = fromZonedTime(`${dateStr}T${availability.endTime}:00`, availability.timezone);
        const length = availability.sessionLengthMinutes;

        for (let slotStart = rangeStart; isBefore(addMinutes(slotStart, length), addMinutes(rangeEnd, 1)); slotStart = addMinutes(slotStart, length)) {
          const slotEnd = addMinutes(slotStart, length);
          const overlapsBooking = bookings.some(
            (b) => b.professorId === professor.id && isBefore(slotStart, b.endAt) && isBefore(b.startAt, slotEnd)
          );
          if (overlapsBooking) continue;

          availableEntries.push({
            startAt: slotStart,
            timeLabel: timeLabelInZone(slotStart, viewerTimezone),
            status: "available",
            professorName: professor.name,
          });
        }
      }
    }
  }

  const entriesByDate = new Map<string, OverviewEntry[]>();
  for (const entry of [...bookedEntries, ...availableEntries]) {
    const key = dateKeyInZone(entry.startAt, viewerTimezone);
    const list = entriesByDate.get(key) ?? [];
    list.push(entry);
    entriesByDate.set(key, list);
  }
  for (const list of entriesByDate.values()) list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const days: OverviewDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = localDateOnly(new Date(year, month, d));
    days.push({ dateKey, dayNumber: d, entries: entriesByDate.get(dateKey) ?? [] });
  }

  // Monday-first weeks, padded with null cells so the grid aligns — JS
  // getDay() is Sunday-first (0-6), so Monday-first needs a (day + 6) % 7 shift.
  const firstWeekdayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const padded: (OverviewDay | null)[] = [...Array(firstWeekdayIndex).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks: (OverviewDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return {
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthStart),
    weeks,
  };
}
