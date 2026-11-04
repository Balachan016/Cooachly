import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card } from "@/components/ui";

export default async function AdminEnquiriesPage() {
  const session = await requireRole("ADMIN");
  const enquiries = await prisma.enquiry.findMany({
    where: { site: session.site },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const replyHref = (e: { email: string; name: string }) => {
    const params = new URLSearchParams({ to: e.email, subject: `Re: your enquiry` });
    return `${sitePath(session.site, "/admin/mail")}?${params.toString()}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold">Enquiries</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Messages submitted through the public Contact page.
      </p>

      <Card className="mt-6 p-0">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {enquiries.map((e) => (
            <div key={e.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">{e.name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(e.createdAt)}
                  </span>
                  <a href={replyHref(e)} className="text-sm font-medium text-brand-700 hover:underline dark:text-brand-400">
                    Reply
                  </a>
                </div>
              </div>
              <div className="text-sm text-black/60 dark:text-white/60">
                {e.email}
                {e.phone ? ` · ${e.phone}` : ""}
                {e.country ? ` · ${e.country}` : ""}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-black/80 dark:text-white/80">{e.message}</p>
            </div>
          ))}
          {enquiries.length === 0 && (
            <p className="p-6 text-sm text-black/50 dark:text-white/50">No enquiries yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
