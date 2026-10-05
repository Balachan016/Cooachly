import { prisma } from "@/lib/prisma";
import { NotificationAddresses, DeliveryStatusBadge } from "@/components/notification-addresses";
import { Badge, Card, Select } from "@/components/ui";
import { whatsAppConfigStatus } from "@/lib/notifications/sms";

function ConfigRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
      <span className="text-black/60 dark:text-white/60">{label}</span>
      {value ? (
        <span className="font-mono text-xs text-black/80 dark:text-white/80">{value}</span>
      ) : (
        <Badge tone="danger">Not set</Badge>
      )}
    </div>
  );
}

export default async function SuperadminRemindersPage(props: PageProps<"/superadmin/reminders">) {
  const searchParams = await props.searchParams;
  const status = typeof searchParams.status === "string" ? searchParams.status : "";

  const logs = await prisma.notificationLog.findMany({
    where: status === "SENT" || status === "FAILED" || status === "SKIPPED" ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 300,
    include: { user: { select: { name: true, email: true, site: true } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Reminder &amp; notification log</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Every email/WhatsApp reminder, manual send, instant call, and test notification across
        both sites. Most recent 300 shown.
      </p>

      <Card className="mt-4 p-0">
        <h2 className="flex items-center gap-2 p-4 pb-0 font-semibold">
          WhatsApp configuration
          <Badge tone={whatsAppConfigStatus.configured ? "success" : "danger"}>
            {whatsAppConfigStatus.configured ? "Configured" : "Not configured"}
          </Badge>
        </h2>
        <p className="px-4 pt-1 text-xs text-black/50 dark:text-white/50">
          Reminders, invites, and demo confirmations each need their own approved template SID —
          without one, that message type falls back to a free-form send, which Twilio/WhatsApp
          rejects outside a 24-hour customer-initiated window (error 63016).
        </p>
        <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
          <ConfigRow label="Sender number" value={whatsAppConfigStatus.from} />
          <ConfigRow label="Reminder template SID" value={whatsAppConfigStatus.reminderTemplateSid} />
          <ConfigRow label="Invite template SID" value={whatsAppConfigStatus.inviteTemplateSid} />
          <ConfigRow label="Demo confirmation template SID" value={whatsAppConfigStatus.demoTemplateSid} />
        </div>
      </Card>

      <form method="get" className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <label className="mb-1 block text-xs font-medium text-black/60 dark:text-white/60">Status</label>
          <Select name="status" defaultValue={status}>
            <option value="">All statuses</option>
            <option value="SENT">Sent</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </Select>
        </div>
        <button
          type="submit"
          className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          Filter
        </button>
        {status && (
          <a href="/superadmin/reminders" className="text-sm font-medium text-black/50 hover:underline dark:text-white/50">
            Clear filter
          </a>
        )}
      </form>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {logs.map((log) => (
            <div key={log.id} className="flex flex-wrap items-center gap-2 px-4 py-3 text-sm">
              {log.user && <Badge>{log.user.site}</Badge>}
              <Badge tone={log.status === "SENT" ? "success" : log.status === "FAILED" ? "danger" : "default"}>
                {log.status}
              </Badge>
              <span className="font-medium">{log.kind}</span>
              <span className="text-black/50 dark:text-white/50">{log.channel}</span>
              <NotificationAddresses log={log} />
              <DeliveryStatusBadge log={log} />
              <span className="text-black/60 dark:text-white/60">
                {log.user ? `${log.user.name} (${log.user.email})` : "—"}
              </span>
              {log.error && <span className="text-red-600 dark:text-red-400">— {log.error}</span>}
              <span className="ml-auto whitespace-nowrap text-xs text-black/40 dark:text-white/40">
                {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(log.createdAt)}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="p-4 text-sm text-black/50 dark:text-white/50">No matching notifications.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
