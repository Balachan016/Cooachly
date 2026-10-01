import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Badge, Card } from "@/components/ui";
import { ScheduleCallForm } from "./schedule-call-form";
import { DemoRequestStatusActions } from "./status-actions";

const STATUS_TONE = {
  PENDING: "default",
  SCHEDULED: "warning",
  JOINED: "success",
  DROPPED: "danger",
} as const;

function toDateTimeLocal(date: Date | null): string {
  if (!date) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default async function AdminDemoRequestsPage() {
  const session = await requireRole("ADMIN");

  const [demoRequests, professors] = await Promise.all([
    prisma.demoRequest.findMany({
      where: { site: session.site },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { professor: true },
    }),
    prisma.user.findMany({
      where: { role: "PROFESSOR", isActive: true, site: session.site },
      include: { professorProfile: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const professorOptions = professors.map((p) => ({
    id: p.id,
    name: p.name,
    subject: p.professorProfile?.subject ?? "",
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Demo requests</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Leads submitted through the public &quot;Book a free demo&quot; page. Schedule a call with the
        requester and a professor, then track whether they end up joining or dropping.
      </p>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {demoRequests.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">{r.name}</div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(r.createdAt)}
                  </div>
                </div>
              </div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {r.email}
                {r.phone ? ` · ${r.phone}` : ""}
                {r.timezone ? ` · ${r.timezone}` : ""}
              </div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                Subject: {r.subject}
                {r.grade ? ` · Grade: ${r.grade}` : ""}
              </div>
              {r.scheduledAt && (
                <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                  Call scheduled with {r.professor?.name ?? "—"} for{" "}
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(r.scheduledAt)}
                  {r.meetingLink ? (
                    <>
                      {" "}
                      ·{" "}
                      <a href={r.meetingLink} className="text-brand-700 hover:underline dark:text-brand-400">
                        meeting link
                      </a>
                    </>
                  ) : null}
                </div>
              )}
              {r.adminNotes && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">{r.adminNotes}</p>
              )}

              <div className="mt-3">
                <ScheduleCallForm
                  demoRequestId={r.id}
                  professors={professorOptions}
                  defaultProfessorId={r.professorId}
                  defaultScheduledAt={toDateTimeLocal(r.scheduledAt)}
                  defaultMeetingLink={r.meetingLink}
                  defaultAdminNotes={r.adminNotes}
                />
              </div>

              <div className="mt-3">
                <DemoRequestStatusActions id={r.id} status={r.status} />
              </div>
            </div>
          ))}
          {demoRequests.length === 0 && (
            <p className="p-6 text-sm text-black/50 dark:text-white/50">No demo requests yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
