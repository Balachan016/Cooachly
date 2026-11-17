import { prisma } from "@/lib/prisma";
import { requireRole, getCurrentUser } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { isInboundMailConfigured } from "@/lib/notifications/inbound-email";
import { Badge, Card } from "@/components/ui";
import { ComposeMailForm } from "./compose-mail-form";
import { InboxRow } from "./inbox-row";

export default async function AdminMailPage(props: PageProps<"/admin/mail">) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  const viewer = await getCurrentUser();
  const viewerTimezone = viewer?.timezone ?? "UTC";
  const searchParams = await props.searchParams;
  const initialTo = typeof searchParams.to === "string" ? searchParams.to : "";
  const initialSubject = typeof searchParams.subject === "string" ? searchParams.subject : "";
  const view = searchParams.view === "sent" ? "sent" : "inbox";
  const mailPath = sitePath(session.site, "/admin/mail");

  const [inbox, unreadCount, sent] = await Promise.all([
    view === "inbox"
      ? prisma.inboundEmail.findMany({ where: { site: session.site }, orderBy: { createdAt: "desc" }, take: 200 })
      : Promise.resolve([]),
    prisma.inboundEmail.count({ where: { site: session.site, readAt: null } }),
    view === "sent"
      ? prisma.adminEmail.findMany({ where: { site: session.site }, orderBy: { createdAt: "desc" }, take: 200, include: { sender: true } })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Mail</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Send email through Cooachly&apos;s own mail system, and read what&apos;s come in at admin@cooachly.com — every
        send and every received message is logged below.
      </p>

      {!isInboundMailConfigured && (
        <p className="mt-2 text-sm text-black/50 dark:text-white/50">
          Inbox isn&apos;t receiving mail yet — see README &quot;Receiving mail at admin@cooachly.com&quot; to set it
          up.
        </p>
      )}

      <Card className="mt-6">
        <h2 className="font-semibold">Compose</h2>
        <div className="mt-4">
          <ComposeMailForm initialTo={initialTo} initialSubject={initialSubject} />
        </div>
      </Card>

      <div className="mt-6 flex gap-1 border-b border-black/10 dark:border-white/10">
        {(["inbox", "sent"] as const).map((tabView) => (
          <a
            key={tabView}
            href={`${mailPath}${tabView === "inbox" ? "" : `?view=${tabView}`}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize ${
              view === tabView
                ? "border-brand-700 text-brand-700 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-black/50 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
            }`}
          >
            {tabView === "inbox" ? "Inbox" : "Sent"}
            {tabView === "inbox" && unreadCount > 0 && (
              <span className="ml-1.5 inline-block rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-semibold text-white">
                {unreadCount}
              </span>
            )}
          </a>
        ))}
      </div>

      {view === "inbox" ? (
        <Card className="mt-6 p-0">
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {inbox.map((email) => (
              <InboxRow key={email.id} email={email} viewerTimezone={viewerTimezone} mailPath={mailPath} />
            ))}
            {inbox.length === 0 && (
              <p className="p-6 text-sm text-black/50 dark:text-white/50">
                {isInboundMailConfigured ? "No mail received yet." : "Inbox isn't configured yet — see above."}
              </p>
            )}
          </div>
        </Card>
      ) : (
        <Card className="mt-6 p-0">
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {sent.map((m) => (
              <div key={m.id} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium">{m.subject}</div>
                  <div className="text-xs text-black/50 dark:text-white/50">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(m.createdAt)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-black/60 dark:text-white/60">
                  <span>
                    To: {m.to}
                    {m.cc ? ` · Cc: ${m.cc}` : ""}
                  </span>
                  <Badge tone={m.status === "SENT" ? "success" : m.status === "FAILED" ? "danger" : "warning"}>
                    {m.status}
                  </Badge>
                </div>
                {m.sender && <div className="text-xs text-black/40 dark:text-white/40">Sent by {m.sender.name}</div>}
                {m.error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{m.error}</p>}
              </div>
            ))}
            {sent.length === 0 && <p className="p-6 text-sm text-black/50 dark:text-white/50">No mail sent yet.</p>}
          </div>
        </Card>
      )}
    </div>
  );
}
