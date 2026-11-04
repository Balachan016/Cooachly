import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Card, Input } from "@/components/ui";
import { InviteUserForm } from "@/components/invite-user-form";
import { ProcessPendingInvitesButton } from "@/components/process-pending-invites-button";
import { getPendingInviteCount } from "@/actions/invites";
import { UserRow } from "./user-row";

const PAGE_SIZE = 25;

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  const session = await requireRole("ADMIN", "SUPERADMIN");
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q.trim() : "";
  const page = Math.max(1, Number(searchParams.page) || 1);

  const where = {
    site: session.site,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, totalCount, pendingInviteCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
    getPendingInviteCount(session.site, session.role),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(p));
    return `${sitePath(session.site, "/admin/users")}?${params.toString()}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            Manage roles and access for everyone on Cooachly.
          </p>
        </div>
        <a
          href="/api/admin/export/users"
          className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Export CSV
        </a>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Create a new user</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Creates their account right away and emails them their login (with an optional welcome
          message) — typically once they&apos;ve confirmed they&apos;d like to continue after a free demo.
        </p>
        <div className="mt-4">
          <InviteUserForm />
        </div>
        <ProcessPendingInvitesButton count={pendingInviteCount} />
      </Card>

      <Card className="mt-6 p-0">
        <form method="get" className="flex items-end gap-3 border-b border-black/10 p-4 dark:border-white/10">
          <div className="w-72">
            <Input type="text" name="q" placeholder="Search by name, email, or code…" defaultValue={q} />
          </div>
          <button type="submit" className="rounded-lg bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">
            Search
          </button>
          {q && (
            <a href={sitePath(session.site, "/admin/users")} className="text-sm font-medium text-black/50 hover:underline dark:text-white/50">
              Clear
            </a>
          )}
          <span className="ml-auto self-center text-sm text-black/50 dark:text-white/50">
            {totalCount} user{totalCount === 1 ? "" : "s"}
          </span>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} viewerRole={session.role} currentUserId={session.userId} />
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-black/50 dark:text-white/50">
                    No users match that search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-black/10 p-4 text-sm dark:border-white/10">
            <span className="text-black/50 dark:text-white/50">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={pageHref(page - 1)} className="rounded-lg border border-black/15 px-3 py-1.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                  Previous
                </a>
              )}
              {page < totalPages && (
                <a href={pageHref(page + 1)} className="rounded-lg border border-black/15 px-3 py-1.5 font-medium hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10">
                  Next
                </a>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
