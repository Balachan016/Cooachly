import "server-only";
import { addMinutes, isBefore } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { prisma } from "@/lib/prisma";

export type PersonOverviewEntry = {
  startAt: Date;
  timeLabel: string;
  status: "booked" | "available";
  /** Who's on the other side of a booked entry, or whose open slot this is — omitted for a professor's own open slot. */
  peerName?: string;
};

export type PersonOverviewDay = { dateKey: string; dayNumber: number; entries: PersonOverviewEntry[] };
export type PersonOverviewMonth = { monthLabel: string; weeks: (PersonOverviewDay | null)[][] };

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

type Availability = {
  professorId: string;
  dayOfWeek: number | null;
  date: Date | null;
  startTime: string;
  endTime: string;
  timezone: string;
  sessionLengthMinutes: number;
};
type BookingOverlap = { professorId: string; startAt: Date; endAt: Date };

/** Expands a set of professors' availability across every day of the month into still-open slots, skipping any that overlap a booking for that professor. Shared by both branches below. */
function expandOpenSlots(
  professors: { id: string; name: string }[],
  availabilities: Availability[],
  bookingsForOverlap: BookingOverlap[],
  year: number,
  month: number,
  daysInMonth: number,
  viewerTimezone: string,
  labelWithProfessorName: boolean
): PersonOverviewEntry[] {
  const entries: PersonOverviewEntry[] = [];

  for (const professor of professors) {
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
          const overlapsBooking = bookingsForOverlap.some(
            (b) => b.professorId === professor.id && isBefore(slotStart, b.endAt) && isBefore(b.startAt, slotEnd)
          );
          if (overlapsBooking) continue;

          entries.push({
            startAt: slotStart,
            timeLabel: timeLabelInZone(slotStart, viewerTimezone),
            status: "available",
            peerName: labelWithProfessorName ? professor.name : undefined,
          });
        }
      }
    }
  }

  return entries;
}

function bucketByDay(entries: PersonOverviewEntry[], year: number, month: number, daysInMonth: number, viewerTimezone: string): PersonOverviewMonth {
  const monthStart = new Date(year, month, 1);
  const entriesByDate = new Map<string, PersonOverviewEntry[]>();
  for (const entry of entries) {
    const key = dateKeyInZone(entry.startAt, viewerTimezone);
    const list = entriesByDate.get(key) ?? [];
    list.push(entry);
    entriesByDate.set(key, list);
  }
  for (const list of entriesByDate.values()) list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  const days: PersonOverviewDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = localDateOnly(new Date(year, month, d));
    days.push({ dateKey, dayNumber: d, entries: entriesByDate.get(dateKey) ?? [] });
  }

  const firstWeekdayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const padded: (PersonOverviewDay | null)[] = [...Array(firstWeekdayIndex).fill(null), ...days];
  while (padded.length % 7 !== 0) padded.push(null);
  const weeks: (PersonOverviewDay | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  return {
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthStart),
    weeks,
  };
}

/**
 * Builds a Monday–Sunday calendar-month view of a single student's or
 * professor's own schedule for their dashboard — their own bookings this
 * month, plus still-open slots they could still book into. For a professor
 * that's their own open availability; for a student it's scoped to only the
 * professor(s) they've actually had a confirmed/completed session with, not
 * every professor on the site, so it reads as "your schedule" rather than
 * exposing the whole team's calendars to every student.
 */
export async function buildPersonMonthOverview(opts: {
  role: "STUDENT" | "PROFESSOR";
  userId: string;
  viewerTimezone: string;
  reference?: Date;
}): Promise<PersonOverviewMonth> {
  const reference = opts.reference ?? new Date();
  const zonedToday = new Intl.DateTimeFormat("en-CA", { timeZone: opts.viewerTimezone, year: "numeric", month: "2-digit" }).format(reference);
  const [zonedYear, zonedMonth] = zonedToday.split("-").map(Number);
  const year = zonedYear;
  const month = zonedMonth - 1;
  const monthStart = new Date(year, month, 1);
  const monthEndExclusive = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const isStudent = opts.role === "STUDENT";

  const ownBookings = await prisma.booking.findMany({
    where: {
      ...(isStudent ? { studentId: opts.userId } : { professorId: opts.userId }),
      status: { in: ["PENDING", "CONFIRMED"] },
      startAt: { gte: monthStart, lt: monthEndExclusive },
    },
    select: {
      startAt: true,
      endAt: true,
      professorId: true,
      student: { select: { name: true } },
      professor: { select: { name: true } },
    },
  });

  const bookedEntries: PersonOverviewEntry[] = ownBookings.map((b) => ({
    startAt: b.startAt,
    timeLabel: timeLabelInZone(b.startAt, opts.viewerTimezone),
    status: "booked" as const,
    peerName: isStudent ? b.professor.name : b.student.name,
  }));

  let availableEntries: PersonOverviewEntry[] = [];

  if (isStudent) {
    const professors = await prisma.user.findMany({
      where: {
        role: "PROFESSOR",
        bookingsAsProfessor: { some: { studentId: opts.userId, status: { in: ["CONFIRMED", "COMPLETED"] } } },
      },
      select: { id: true, name: true },
    });

    if (professors.length > 0) {
      const professorIds = professors.map((p) => p.id);
      const [availabilities, professorsBookingsThisMonth] = await Promise.all([
        prisma.availability.findMany({ where: { professorId: { in: professorIds }, isActive: true } }),
        prisma.booking.findMany({
          where: { professorId: { in: professorIds }, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { gte: monthStart, lt: monthEndExclusive } },
          select: { professorId: true, startAt: true, endAt: true },
        }),
      ]);
      availableEntries = expandOpenSlots(
        professors,
        availabilities,
        professorsBookingsThisMonth,
        year,
        month,
        daysInMonth,
        opts.viewerTimezone,
        true
      );
    }
  } else {
    const availabilities = await prisma.availability.findMany({ where: { professorId: opts.userId, isActive: true } });
    availableEntries = expandOpenSlots(
      [{ id: opts.userId, name: "" }],
      availabilities,
      ownBookings,
      year,
      month,
      daysInMonth,
      opts.viewerTimezone,
      false
    );
  }

  return bucketByDay([...bookedEntries, ...availableEntries], year, month, daysInMonth, opts.viewerTimezone);
}
