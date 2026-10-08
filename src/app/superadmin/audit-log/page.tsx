import { prisma } from "@/lib/prisma";
import { Badge, Card, Select } from "@/components/ui";
import type { AuditAction } from "@prisma/client";

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  BOOKING_CANCELLED: "Booking cancelled",
  BOOKING_RESCHEDULED: "Booking rescheduled",
  BOOKING_DELETED: "Booking deleted",
  COACH_APPLICATION_STATUS_CHANGED: "Coach application updated",
  USER_ROLE_CHANGED: "Role changed",
  USER_ACTIVATED: "User activated",
  USER_DEACTIVATED: "User deactivated",
  USER_DELETED: "User deleted",
  USER_PROFILE_UPDATED: "Profile updated",
  PASSWORD_RESET_BY_ADMIN: "Password reset by admin",
  ACCOUNT_INVITE_SENT: "Invite sent",
  ACCOUNT_INVITE_REDEEMED: "Invite redeemed",
  DEMO_REQUEST_SCHEDULED: "Demo call scheduled",
  DEMO_REQUEST_STATUS_CHANGED: "Demo request status changed",
  ADMIN_ACCOUNT_CREATED: "Admin account created",
  SCHEDULE_IMPORTED: "Schedule imported",
  ADMIN_VIEWED_USER: "Admin viewed user (read-only)",
  ADMIN_SWITCHED_TO_USER: "Admin switched into user account",
  ADMIN_RETURNED_TO_OWN_ACCOUNT: "Admin returned from switched-in account",
  TEST_ASSIGNED_BY_ADMIN: "Test assigned by admin on professor's behalf",
  BOOKING_RESCHEDULE_PROPOSED: "Reschedule proposed",
  BOOKING_RESCHEDULE_DECLINED: "Reschedule declined",
};

export default async function SuperadminAuditLogPage(props: PageProps<"/superadmin/audit-log">) {
  const searchParams = await props.searchParams;
  const site = typeof searchParams.site === "string" ? searchParams.site : "";
  const rawAction = typeof searchParams.action === "string" ? searchParams.action : "";
  const action = rawAction in ACTION_LABEL ? (rawAction as AuditAction) : undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(site === "COOACHLY" || site === "ARTS" ? { site } : {}),
      ...(action ? { action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { actor: { select: { name: true, email: true, role: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Audit log</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Logins/logouts, admin approvals, booking cancellations, and account management events
        across both sites. Most recent 300 shown.
      </p>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Site</label>
          <Select name="site" defaultValue={site}>
            <option value="">All sites</option>
            <option value="COOACHLY">Cooachly</option>
            <option value="ARTS">Arts</option>
          </Select>
        </div>
        <div className="w-64">
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Action</label>
          <Select name="action" defaultValue={action ?? ""}>
            <option value="">All actions</option>
            {Object.entries(ACTION_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Filter
        </button>
        {(site || action) && (
          <a href="/superadmin/audit-log" className="text-sm font-medium text-black/50 hover:underline dark:text-white/50">
            Clear filters
          </a>
        )}
      </form>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <Badge>{log.site}</Badge>
              <span className="font-medium">{ACTION_LABEL[log.action] ?? log.action}</span>
              <span className="text-black/60 dark:text-white/60">
                {log.actor ? `${log.actor.name} (${log.actor.email}, ${log.actor.role.toLowerCase()})` : "system"}
              </span>
              {log.targetType && (
                <span className="text-black/40 dark:text-white/40">
                  → {log.targetType}
                  {log.targetId ? `:${log.targetId.slice(0, 8)}` : ""}
                </span>
              )}
              {log.detail && <span className="text-black/50 dark:text-white/50">— {log.detail}</span>}
              <span className="ml-auto whitespace-nowrap text-xs text-black/40 dark:text-white/40">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="p-4 text-sm text-black/50 dark:text-white/50">No matching activity.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
