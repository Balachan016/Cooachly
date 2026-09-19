import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";
import { CoachApplicationStatusActions } from "./status-actions";

const STATUS_TONE = {
  PENDING: "default",
  REVIEWING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
} as const;

export default async function AdminCoachApplicationsPage() {
  const applications = await prisma.coachApplication.findMany({ orderBy: { createdAt: "desc" }, take: 200 });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Coach applications</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Applications submitted through the public &quot;Become a Coach&quot; page.
      </p>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {applications.map((a) => (
            <div key={a.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">{a.name}</div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(a.createdAt)}
                  </div>
                </div>
              </div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {a.email}
                {a.phone ? ` · ${a.phone}` : ""}
              </div>
              <div className="mt-1 text-sm text-black/70 dark:text-white/70">
                {a.subject}
                {a.curricula.length ? ` · ${a.curricula.join(", ")}` : ""}
                {a.yearsExperience != null ? ` · ${a.yearsExperience} yrs experience` : ""}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">{a.qualifications}</p>
              {a.availability && (
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">Availability: {a.availability}</p>
              )}
              {a.message && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-black/60 dark:text-white/60">{a.message}</p>
              )}
              <div className="mt-3">
                <CoachApplicationStatusActions id={a.id} status={a.status} />
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <p className="p-6 text-sm text-black/50 dark:text-white/50">No coach applications yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
