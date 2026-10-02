"use server";

import { revalidatePath } from "next/cache";
import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import type { Booking, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { provisionVideoRoomForBooking } from "@/lib/daily";
import { sendBookingConfirmation } from "@/lib/notifications/booking-confirmation";
import { logAudit } from "@/lib/audit";
import { sitePath } from "@/lib/site";

const SESSION_LENGTH_MINUTES = 60;

type ImportRowResult = {
  line: number;
  student: string;
  professor: string;
  when: string;
  status: "created" | "skipped";
  reason?: string;
};

export type ImportScheduleState = { message?: string; success?: true; results?: ImportRowResult[] } | undefined;

function parseDate(raw: string): string | null {
  const ddmmyyyy = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return null;
}

function stripTitle(name: string) {
  return name.replace(/^(Ms|Mrs|Mr|Dr)\.?\s+/i, "").trim();
}

type BookingWithParties = Booking & { student: User; professor: User };

/**
 * Bulk-creates confirmed bookings from a pasted schedule (e.g. a professor's
 * monthly class list), converting each row's local date/time to UTC via its
 * given IANA timezone. Matches student/professor by name within the acting
 * admin's site — ambiguous or missing names are reported, not guessed at.
 * Skips any row that would double-book the professor or student. Every
 * created booking gets a video room (if Daily is configured) and the same
 * confirmation email/WhatsApp used for self-service bookings, so professors,
 * students, and admins (CC'd on every confirmation) all hear about it.
 */
export async function importBookingSchedule(_state: ImportScheduleState, formData: FormData): Promise<ImportScheduleState> {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const csv = String(formData.get("csv") ?? "").trim();
  if (!csv) return { message: "Paste a schedule to import." };

  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  const startIndex = /^student\s*,/i.test(lines[0] ?? "") ? 1 : 0;
  const rows = lines.slice(startIndex);
  if (rows.length === 0) return { message: "Paste a schedule to import." };

  const studentCache = new Map<string, { user: User | null; count: number }>();
  const professorCache = new Map<string, { user: (User & { professorProfile: { hourlyRateCents: number } | null }) | null; count: number }>();

  async function findStudent(rawName: string) {
    const key = rawName.trim().toLowerCase();
    const cached = studentCache.get(key);
    if (cached) return cached;
    let candidates = await prisma.user.findMany({
      where: { site: session.site, role: "STUDENT", name: { equals: rawName.trim(), mode: "insensitive" } },
    });
    if (candidates.length === 0) {
      candidates = await prisma.user.findMany({
        where: { site: session.site, role: "STUDENT", name: { contains: rawName.trim(), mode: "insensitive" } },
      });
    }
    const entry = { user: candidates.length === 1 ? candidates[0] : null, count: candidates.length };
    studentCache.set(key, entry);
    return entry;
  }

  async function findProfessor(rawName: string) {
    const key = stripTitle(rawName).toLowerCase();
    const cached = professorCache.get(key);
    if (cached) return cached;
    const candidates = await prisma.user.findMany({
      where: { site: session.site, role: "PROFESSOR", name: { contains: key, mode: "insensitive" } },
      include: { professorProfile: { select: { hourlyRateCents: true } } },
    });
    const entry = { user: candidates.length === 1 ? candidates[0] : null, count: candidates.length };
    professorCache.set(key, entry);
    return entry;
  }

  const results: ImportRowResult[] = [];
  const createdBookings: BookingWithParties[] = [];

  for (let i = 0; i < rows.length; i++) {
    const lineNo = startIndex + i + 1;
    const cols = rows[i].split(",").map((c) => c.trim());
    const [studentName = "", professorName = "", subject = "", dateRaw = "", timeRaw = "", timezone = ""] = cols;

    if (cols.length < 6) {
      results.push({ line: lineNo, student: studentName, professor: professorName, when: "", status: "skipped", reason: "Expected 6 columns: Student,Professor,Subject,Date,Time,Timezone" });
      continue;
    }

    const isoDate = parseDate(dateRaw);
    if (!isoDate || !/^\d{2}:\d{2}$/.test(timeRaw) || !timezone) {
      results.push({ line: lineNo, student: studentName, professor: professorName, when: `${dateRaw} ${timeRaw}`, status: "skipped", reason: "Invalid date, time, or timezone." });
      continue;
    }

    let startAt: Date;
    try {
      startAt = fromZonedTime(`${isoDate}T${timeRaw}:00`, timezone);
    } catch {
      results.push({ line: lineNo, student: studentName, professor: professorName, when: `${dateRaw} ${timeRaw}`, status: "skipped", reason: `Unrecognized timezone "${timezone}".` });
      continue;
    }
    if (Number.isNaN(startAt.getTime())) {
      results.push({ line: lineNo, student: studentName, professor: professorName, when: `${dateRaw} ${timeRaw}`, status: "skipped", reason: "Invalid date or time." });
      continue;
    }
    const endAt = addMinutes(startAt, SESSION_LENGTH_MINUTES);
    const whenLabel = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(startAt);

    const professorEntry = await findProfessor(professorName);
    if (!professorEntry.user) {
      results.push({
        line: lineNo, student: studentName, professor: professorName, when: whenLabel, status: "skipped",
        reason: professorEntry.count === 0 ? "Professor not found." : "Multiple professors match this name.",
      });
      continue;
    }

    const studentEntry = await findStudent(studentName);
    if (!studentEntry.user) {
      results.push({
        line: lineNo, student: studentName, professor: professorName, when: whenLabel, status: "skipped",
        reason: studentEntry.count === 0 ? "Student not found." : "Multiple students match this name — use their full name.",
      });
      continue;
    }

    const [professorConflict, studentConflict] = await Promise.all([
      prisma.booking.findFirst({
        where: { professorId: professorEntry.user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: endAt }, endAt: { gt: startAt } },
      }),
      prisma.booking.findFirst({
        where: { studentId: studentEntry.user.id, status: { in: ["PENDING", "CONFIRMED"] }, startAt: { lt: endAt }, endAt: { gt: startAt } },
      }),
    ]);
    if (professorConflict || studentConflict) {
      results.push({
        line: lineNo, student: studentEntry.user.name, professor: professorEntry.user.name, when: whenLabel, status: "skipped",
        reason: professorConflict ? "Professor already has a session at this time." : "Student already has a session at this time.",
      });
      continue;
    }

    const hourlyRateCents = professorEntry.user.professorProfile?.hourlyRateCents ?? 0;

    const booking = await prisma.booking.create({
      data: {
        studentId: studentEntry.user.id,
        professorId: professorEntry.user.id,
        startAt,
        endAt,
        status: "CONFIRMED",
        paymentStatus: "UNPAID",
        priceCents: hourlyRateCents,
        notes: subject ? `Imported schedule: ${subject}` : "Imported schedule",
      },
      include: { student: true, professor: true },
    });
    await provisionVideoRoomForBooking(booking);
    createdBookings.push(booking);
    results.push({ line: lineNo, student: studentEntry.user.name, professor: professorEntry.user.name, when: whenLabel, status: "created" });
  }

  const groups = new Map<string, BookingWithParties[]>();
  for (const booking of createdBookings) {
    const key = `${booking.studentId}:${booking.professorId}`;
    const list = groups.get(key) ?? [];
    list.push(booking);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    await sendBookingConfirmation(group);
  }

  if (createdBookings.length > 0) {
    await logAudit({
      site: session.site,
      action: "SCHEDULE_IMPORTED",
      actorId: session.userId,
      detail: `Imported ${createdBookings.length} session(s), skipped ${results.length - createdBookings.length}`,
    });
    revalidatePath(sitePath(session.site, "/admin/bookings"));
    revalidatePath(sitePath(session.site, "/professor/bookings"));
    revalidatePath(sitePath(session.site, "/student/bookings"));
  }

  const skippedCount = results.length - createdBookings.length;
  return {
    message: `Imported ${createdBookings.length} session${createdBookings.length === 1 ? "" : "s"}${skippedCount ? `, skipped ${skippedCount}` : ""}.`,
    ...(createdBookings.length > 0 ? { success: true as const } : {}),
    results,
  };
}
