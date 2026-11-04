import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Badge, Card } from "@/components/ui";
import { ComposeMailForm } from "./compose-mail-form";

export default async function AdminMailPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  const sent = await prisma.adminEmail.findMany({
    where: { site: session.site },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { sender: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Mail</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Send email through Cooachly Arts&apos; own mail system — every send is logged below.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Compose</h2>
        <div className="mt-4">
          <ComposeMailForm />
        </div>
      </Card>

      <Card className="mt-6 p-0">
        <div className="p-4">
          <h2 className="font-semibold">Sent mail</h2>
        </div>
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
    </div>
  );
}
