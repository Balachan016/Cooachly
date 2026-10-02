"use server";

import { Readable } from "stream";
import ExcelJS from "exceljs";
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

/**
 * A plain CSV cell always arrives as a string, but a genuine .xlsx cell
 * typed/formatted as a date or time in Excel arrives as a JS Date instead —
 * reformat those back to the "DD-MM-YYYY" / "HH:mm" text our parser expects.
 * Everything else (text, numbers) is just stringified as-is.
 */
function cellToString(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const d = String(value.getDate()).padStart(2, "0");
    const mo = String(value.getMonth() + 1).padStart(2, "0");
    const y = value.getFullYear();
    const h = value.getHours();
    const mi = value.getMinutes();
    // A date-only cell parses to local midnight; a time-only cell parses to
    // 1899-12-30 (Excel's day-zero) plus the time of day. Tell them apart by
    // which part is non-zero rather than guessing from context.
    if (h === 0 && mi === 0) return `${d}-${mo}-${y}`;
    return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
  }
  if (typeof value === "object" && "text" in value) return String(value.text ?? "");
  if (typeof value === "object" && "richText" in value) return value.richText.map((r) => r.text).join("");
  return String(value).trim();
}

/** Reads the first sheet of an uploaded .csv/.xlsx/.xls file into rows of string cells. */
async function readRowsFromFile(file: File): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = new ExcelJS.Workbook();

  if (file.name.toLowerCase().endsWith(".csv")) {
    // exceljs's default CSV reader auto-detects numbers and dates per cell —
    // including "MM-DD-YYYY", which silently swaps day and month for our
    // DD-MM-YYYY format (03-10-2026 → March 10, not 3 Oct). Disable all of
    // that and keep every cell as the literal text it was written as.
    await workbook.csv.read(Readable.from(buffer), { map: (value: string) => value });
  } else {
    // exceljs's bundled types predate current @types/node's Buffer generic;
    // this is a real Node Buffer at runtime, just a structural type mismatch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buffer as any);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) return [];

  const rows: string[][] = [];
  worksheet.eachRow((row) => {
    const values = row.values as ExcelJS.CellValue[]; // 1-indexed; values[0] is unused
    const cells: string[] = [];
    for (let i = 1; i < values.length; i++) cells.push(cellToString(values[i]));
    if (cells.some((c) => c !== "")) rows.push(cells);
  });
  return rows;
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

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a schedule file (.csv or .xlsx) to import." };
  }

  let parsedRows: string[][];
  try {
    parsedRows = await readRowsFromFile(file);
  } catch (err) {
    console.error("Failed to parse uploaded schedule file", err);
    return { message: "Couldn't read that file — make sure it's a valid .csv or .xlsx export." };
  }
  if (parsedRows.length === 0) return { message: "That file has no rows to import." };

  const startIndex = /^student$/i.test(parsedRows[0]?.[0]?.trim() ?? "") ? 1 : 0;
  const rows = parsedRows.slice(startIndex);
  if (rows.length === 0) return { message: "That file has no rows to import." };

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
    const cols = rows[i].map((c) => c.trim());
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
