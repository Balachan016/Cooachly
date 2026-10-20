import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { Badge, Card } from "@/components/ui";
import { RecordPaymentForm } from "./record-payment-form";
import { OverrideToggle } from "./override-toggle";

function currentPeriod(timezone: string): { year: number; month: number } {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(new Date());
  const [year, month] = formatted.split("-").map(Number);
  return { year, month };
}

export default async function AdminPaymentsPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  if (session.site !== "COOACHLY") {
    return (
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          Cooachly Arts doesn&apos;t process payment through the platform — gurus arrange and collect their rate
          directly with each student.
        </p>
      </div>
    );
  }

  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";
  const { year, month } = currentPeriod(viewerTimezone);
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));

  const [students, professorRows, enrollments, paymentsThisMonth] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STUDENT", site: session.site, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: "PROFESSOR", site: session.site, isActive: true },
      select: { id: true, name: true, professorProfile: { select: { subject: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.studentEnrollment.findMany({
      where: { student: { site: session.site } },
      include: { student: true, professor: { include: { professorProfile: true } } },
      orderBy: { student: { name: "asc" } },
    }),
    prisma.monthlyPayment.findMany({
      where: { periodYear: year, periodMonth: month, student: { site: session.site } },
    }),
  ]);

  const professors = professorRows.map((p) => ({ id: p.id, name: p.name, subject: p.professorProfile?.subject || "Coaching" }));
  const paymentByPair = new Map(paymentsThisMonth.map((p) => [`${p.studentId}:${p.professorId}`, p]));
  const enrollmentByPair = new Map(enrollments.map((e) => [`${e.studentId}:${e.professorId}`, e]));

  // Every student×professor combination gets a row — not just pairs with an
  // existing payment — so admin can flip the override on for a pair that's
  // never had a payment recorded at all (e.g. a trial or comped student).
  const rows = students.flatMap((student) =>
    professors.map((professor) => {
      const key = `${student.id}:${professor.id}`;
      return {
        key,
        studentId: student.id,
        studentName: student.name,
        professorId: professor.id,
        professorName: professor.name,
        subject: professor.subject,
        monthlyClassQuota: enrollmentByPair.get(key)?.monthlyClassQuota ?? 8,
        slotViewOverride: enrollmentByPair.get(key)?.slotViewOverride ?? false,
        payment: paymentByPair.get(key),
      };
    }),
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payments</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Record each student&apos;s monthly package payment per professor (one professor teaches one subject). A
        student can only view and book that professor&apos;s open slots once this month&apos;s payment is on file —
        or the override below is switched on.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Record a payment</h2>
        <RecordPaymentForm students={students} professors={professors} />
      </Card>

      <Card className="mt-6 p-0">
        <div className="p-4 pb-0">
          <h2 className="font-semibold">{monthLabel}</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Professor · subject</th>
                <th className="py-2 pr-3">Quota</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Paid on</th>
                <th className="py-2">Override access</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="py-2 pr-3 font-medium">{row.studentName}</td>
                  <td className="py-2 pr-3">
                    {row.professorName} · {row.subject}
                  </td>
                  <td className="py-2 pr-3">{row.monthlyClassQuota} / mo</td>
                  <td className="py-2 pr-3">
                    <Badge tone={row.payment ? "success" : "danger"}>{row.payment ? "Paid" : "Unpaid"}</Badge>
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {row.payment ? `₹${(row.payment.amountCents / 100).toLocaleString("en-IN")}` : "—"}
                  </td>
                  <td className="py-2 pr-3">
                    {row.payment ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(row.payment.paidAt) : "—"}
                  </td>
                  <td className="py-2">
                    <OverrideToggle studentId={row.studentId} professorId={row.professorId} override={row.slotViewOverride} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-black/50 dark:text-white/50">
                    No students or professors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
