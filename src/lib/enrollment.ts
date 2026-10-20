import "server-only";
import { prisma } from "@/lib/prisma";

function currentPeriod(viewerTimezone: string, reference: Date = new Date()): { year: number; month: number } {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: viewerTimezone, year: "numeric", month: "2-digit" }).format(reference);
  const [year, month] = formatted.split("-").map(Number);
  return { year, month };
}

export type SlotAccessCheck = {
  allowed: boolean;
  reason: "paid" | "override" | "no-enrollment-yet" | "unpaid";
};

/**
 * Cooachly-only gate (Arts doesn't run payment through the platform at all —
 * see bookSlots): can this student currently view/book this professor's open
 * slots? Allowed if a MonthlyPayment is on file for (student, professor,
 * this calendar month in the student's own timezone), or if their
 * StudentEnrollment has the admin override on. A student with no enrollment
 * row at all yet — no payment ever recorded, no override set — is blocked
 * the same as an unpaid one; "no-enrollment-yet" is just a distinct reason
 * so the UI can say "we haven't set this up for you yet" instead of implying
 * a payment is overdue.
 */
export async function checkSlotAccess(opts: { studentId: string; professorId: string; viewerTimezone: string; reference?: Date }): Promise<SlotAccessCheck> {
  const { year, month } = currentPeriod(opts.viewerTimezone, opts.reference);

  const [enrollment, payment] = await Promise.all([
    prisma.studentEnrollment.findUnique({
      where: { studentId_professorId: { studentId: opts.studentId, professorId: opts.professorId } },
    }),
    prisma.monthlyPayment.findUnique({
      where: {
        studentId_professorId_periodYear_periodMonth: {
          studentId: opts.studentId,
          professorId: opts.professorId,
          periodYear: year,
          periodMonth: month,
        },
      },
    }),
  ]);

  if (payment) return { allowed: true, reason: "paid" };
  if (enrollment?.slotViewOverride) return { allowed: true, reason: "override" };
  if (!enrollment) return { allowed: false, reason: "no-enrollment-yet" };
  return { allowed: false, reason: "unpaid" };
}

export type StudentQuotaProgress = {
  professorId: string;
  professorName: string;
  subject: string;
  monthlyClassQuota: number;
  scheduledCount: number;
  attendedCount: number;
};

/** This student's quota progress this month, for every professor they have an enrollment row with. */
export async function getStudentQuotaProgress(studentId: string, viewerTimezone: string, reference: Date = new Date()): Promise<StudentQuotaProgress[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { studentId },
    include: { professor: { include: { professorProfile: true } } },
  });
  if (enrollments.length === 0) return [];

  const { year, month } = currentPeriod(viewerTimezone, reference);
  const monthStart = new Date(year, month - 1, 1);
  const monthEndExclusive = new Date(year, month, 1);

  const bookings = await prisma.booking.findMany({
    where: {
      studentId,
      professorId: { in: enrollments.map((e) => e.professorId) },
      startAt: { gte: monthStart, lt: monthEndExclusive },
    },
    select: { professorId: true, status: true },
  });

  return enrollments.map((e) => {
    const profBookings = bookings.filter((b) => b.professorId === e.professorId);
    return {
      professorId: e.professorId,
      professorName: e.professor.name,
      subject: e.professor.professorProfile?.subject || "Coaching",
      monthlyClassQuota: e.monthlyClassQuota,
      scheduledCount: profBookings.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").length,
      attendedCount: profBookings.filter((b) => b.status === "COMPLETED").length,
    };
  });
}

export type ProfessorQuotaProgress = {
  studentId: string;
  studentName: string;
  subject: string;
  monthlyClassQuota: number;
  scheduledCount: number;
  attendedCount: number;
};

/** This professor's quota progress this month, for every student enrolled with them. */
export async function getProfessorQuotaProgress(professorId: string, viewerTimezone: string, reference: Date = new Date()): Promise<ProfessorQuotaProgress[]> {
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { professorId },
    include: { student: true, professor: { include: { professorProfile: true } } },
  });
  if (enrollments.length === 0) return [];

  const { year, month } = currentPeriod(viewerTimezone, reference);
  const monthStart = new Date(year, month - 1, 1);
  const monthEndExclusive = new Date(year, month, 1);

  const bookings = await prisma.booking.findMany({
    where: {
      professorId,
      studentId: { in: enrollments.map((e) => e.studentId) },
      startAt: { gte: monthStart, lt: monthEndExclusive },
    },
    select: { studentId: true, status: true },
  });

  const subject = enrollments[0]?.professor.professorProfile?.subject || "Coaching";

  return enrollments.map((e) => {
    const studentBookings = bookings.filter((b) => b.studentId === e.studentId);
    return {
      studentId: e.studentId,
      studentName: e.student.name,
      subject,
      monthlyClassQuota: e.monthlyClassQuota,
      scheduledCount: studentBookings.filter((b) => b.status === "PENDING" || b.status === "CONFIRMED").length,
      attendedCount: studentBookings.filter((b) => b.status === "COMPLETED").length,
    };
  });
}
