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
};

/**
 * Expands a professor's recurring weekly availability into concrete UTC
 * slots over the next BOOKING_WINDOW_DAYS days, excluding slots that
 * overlap an existing non-cancelled booking.
 */
export const DEMO_SESSION_LENGTH_MINUTES = 30;

export async function getAvailableSlots(
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

        const overlaps = bookings.some(
          (b) => isBefore(slotStart, b.endAt) && isBefore(b.startAt, slotEnd)
        );
        if (overlaps) continue;

        slots.push({ startAt: slotStart, endAt: slotEnd, sessionLengthMinutes: length });
      }
    }
  }

  slots.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return slots;
}

export type DemoSlot = AvailableSlot & { professorId: string; professorName: string };

/**
 * Aggregates 30-minute demo slots across every active professor teaching
 * the given subject, for the public demo-booking page (no login required).
 */
export async function getDemoSlotsForSubject(subject: string): Promise<DemoSlot[]> {
  const professors = await prisma.user.findMany({
    where: {
      role: "PROFESSOR",
      isActive: true,
      professorProfile: { subject: { equals: subject, mode: "insensitive" } },
    },
    select: { id: true, name: true },
  });

  const perProfessor = await Promise.all(
    professors.map(async (professor) => {
      const slots = await getAvailableSlots(professor.id, { sessionLengthOverride: DEMO_SESSION_LENGTH_MINUTES });
      return slots.map((slot) => ({ ...slot, professorId: professor.id, professorName: professor.name }));
    })
  );

  return perProfessor.flat().sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export function groupDemoSlotsByLocalDay(slots: DemoSlot[], timezone: string) {
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  const groups = new Map<
    string,
    { startAt: string; label: string; professorId: string; professorName: string }[]
  >();
  for (const slot of slots) {
    const dayLabel = dayFormatter.format(slot.startAt);
    const list = groups.get(dayLabel) ?? [];
    list.push({
      startAt: slot.startAt.toISOString(),
      label: `${timeFormatter.format(slot.startAt)} with ${slot.professorName}`,
      professorId: slot.professorId,
      professorName: slot.professorName,
    });
    groups.set(dayLabel, list);
  }

  return Array.from(groups.entries()).map(([day, times]) => ({ day, times }));
}

export function groupSlotsByLocalDay(slots: AvailableSlot[], timezone: string) {
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  });

  const groups = new Map<string, { startAt: string; label: string; sessionLengthMinutes: number }[]>();
  for (const slot of slots) {
    const dayLabel = dayFormatter.format(slot.startAt);
    const list = groups.get(dayLabel) ?? [];
    list.push({
      startAt: slot.startAt.toISOString(),
      label: `${timeFormatter.format(slot.startAt)} (${slot.sessionLengthMinutes} min)`,
      sessionLengthMinutes: slot.sessionLengthMinutes,
    });
    groups.set(dayLabel, list);
  }

  return Array.from(groups.entries()).map(([day, times]) => ({ day, times }));
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
