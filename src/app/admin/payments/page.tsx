import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { Badge, Card } from "@/components/ui";
import { RecordPaymentForm } from "./record-payment-form";
import { OverrideToggle } from "./override-toggle";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function currentPeriod(timezone: string): { year: number; month: number } {
  const formatted = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit" }).format(new Date());
  const [year, month] = formatted.split("-").map(Number);
  return { year, month };
}

export default async function AdminPaymentsPage(props: PageProps<"/admin/payments">) {
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

  const searchParams = await props.searchParams;
  const tab = searchParams.tab === "override" ? "override" : "payments";

  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";
  const { year, month } = currentPeriod(viewerTimezone);

  const [students, professorRows] = await Promise.all([
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
  ]);
  const professors = professorRows.map((p) => ({ id: p.id, name: p.name, subject: p.professorProfile?.subject || "Coaching" }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Payments</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Record each student&apos;s monthly or yearly package payment per professor (one professor teaches one
        subject). A student can only view and book that professor&apos;s open slots once that month&apos;s payment
        is on file — or the override under the Override access tab is switched on.
      </p>

      <div className="mt-4 flex gap-1 border-b border-black/10 dark:border-white/10">
        {(["payments", "override"] as const).map((tabName) => (
          <a
            key={tabName}
            href={tabName === "payments" ? "?" : "?tab=override"}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === tabName
                ? "border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
            }`}
          >
            {tabName === "payments" ? "Payments" : "Override access"}
          </a>
        ))}
      </div>

      {tab === "payments" ? (
        <PaymentsTab session={session} students={students} professors={professors} />
      ) : (
        <OverrideTab session={session} students={students} professors={professors} year={year} month={month} />
      )}
    </div>
  );
}

async function PaymentsTab({
  session,
  students,
  professors,
}: {
  session: { site: "COOACHLY" | "ARTS" };
  students: { id: string; name: string }[];
  professors: { id: string; name: string; subject: string }[];
}) {
  const payments = await prisma.monthlyPayment.findMany({
    where: { student: { site: session.site } },
    include: { student: true, professor: { include: { professorProfile: true } } },
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }, { paidAt: "desc" }],
    take: 200,
  });

  return (
    <>
      <Card className="mt-6">
        <h2 className="font-semibold">Record a payment</h2>
        <RecordPaymentForm students={students} professors={professors} />
      </Card>

      <Card className="mt-6 p-0">
        <div className="p-4 pb-0">
          <h2 className="font-semibold">History</h2>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="py-2 pr-3">Student</th>
                <th className="py-2 pr-3">Professor · subject</th>
                <th className="py-2 pr-3">For month</th>
                <th className="py-2 pr-3 text-right">Amount</th>
                <th className="py-2 pr-3">Paid on</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="py-2 pr-3 font-medium">{p.student.name}</td>
                  <td className="py-2 pr-3">
                    {p.professor.name} · {p.professor.professorProfile?.subject || "Coaching"}
                  </td>
                  <td className="py-2 pr-3">
                    {MONTHS[p.periodMonth - 1]} {p.periodYear}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    {p.currency === "inr" ? "₹" : `${p.currency.toUpperCase()} `}
                    {(p.amountCents / 100).toLocaleString("en-IN")}
                  </td>
                  <td className="py-2 pr-3">{new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(p.paidAt)}</td>
                  <td className="py-2 max-w-[16rem] text-xs text-black/60 dark:text-white/60">{p.notes || "—"}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-black/50 dark:text-white/50">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

async function OverrideTab({
  session,
  students,
  professors,
  year,
  month,
}: {
  session: { site: "COOACHLY" | "ARTS" };
  students: { id: string; name: string }[];
  professors: { id: string; name: string; subject: string }[];
  year: number;
  month: number;
}) {
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));

  const [enrollments, paymentsThisMonth] = await Promise.all([
    prisma.studentEnrollment.findMany({
      where: { student: { site: session.site } },
      include: { student: true, professor: { include: { professorProfile: true } } },
      orderBy: { student: { name: "asc" } },
    }),
    prisma.monthlyPayment.findMany({
      where: { periodYear: year, periodMonth: month, student: { site: session.site } },
    }),
  ]);

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
    <>
      <p className="mt-6 text-sm text-black/60 dark:text-white/60">
        Switch on to let a student view and book a professor&apos;s open slots for {monthLabel} even without a
        payment on file — e.g. a trial or comped student.
      </p>
      <Card className="mt-4 p-0">
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
                  <td className="py-2">
                    <OverrideToggle studentId={row.studentId} professorId={row.professorId} override={row.slotViewOverride} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-black/50 dark:text-white/50">
                    No students or professors yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
