import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";

const ACTION_LABEL: Record<string, string> = {
  LOGIN: "Login",
  LOGOUT: "Logout",
  BOOKING_CANCELLED: "Booking cancelled",
  COACH_APPLICATION_STATUS_CHANGED: "Coach application updated",
  USER_ROLE_CHANGED: "Role changed",
  USER_ACTIVATED: "User activated",
  USER_DEACTIVATED: "User deactivated",
  USER_PROFILE_UPDATED: "Profile updated",
  PASSWORD_RESET_BY_ADMIN: "Password reset by admin",
  ACCOUNT_INVITE_SENT: "Invite sent",
  ACCOUNT_INVITE_REDEEMED: "Invite redeemed",
};

export default async function SuperadminOverviewPage() {
  const [adminCount, cooachlyUsers, artsUsers, cooachlyBookings, artsBookings, recentLogs] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["ADMIN", "SUPERADMIN"] } } }),
    prisma.user.count({ where: { site: "COOACHLY" } }),
    prisma.user.count({ where: { site: "ARTS" } }),
    prisma.booking.count({ where: { professor: { site: "COOACHLY" } } }),
    prisma.booking.count({ where: { professor: { site: "ARTS" } } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Superadmin overview</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Cross-site visibility across Cooachly and Cooachly Arts.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Admin accounts" value={adminCount} />
        <Stat label="Cooachly users" value={cooachlyUsers} />
        <Stat label="Arts users" value={artsUsers} />
        <Stat label="Total bookings" value={cooachlyBookings + artsBookings} />
      </div>

      <Card className="mt-6 p-0">
        <div className="flex items-center justify-between p-4">
          <h2 className="font-semibold">Recent activity</h2>
          <a href="/superadmin/audit-log" className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
            View full audit log →
          </a>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {recentLogs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              <Badge>{log.site}</Badge>
              <span className="font-medium">{ACTION_LABEL[log.action] ?? log.action}</span>
              <span className="text-black/60 dark:text-white/60">
                {log.actor ? `${log.actor.name} (${log.actor.role.toLowerCase()})` : "system"}
              </span>
              {log.detail && <span className="text-black/50 dark:text-white/50">— {log.detail}</span>}
              <span className="ml-auto text-xs text-black/40 dark:text-white/40">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
              </span>
            </div>
          ))}
          {recentLogs.length === 0 && (
            <p className="p-4 text-sm text-black/50 dark:text-white/50">No activity logged yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <div className="text-sm text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Card>
  );
}
