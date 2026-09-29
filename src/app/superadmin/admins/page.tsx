import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { Card } from "@/components/ui";
import { CreateAdminForm } from "./create-admin-form";
import { AdminRow } from "./admin-row";

export default async function SuperadminAdminsPage() {
  const session = await requireRole("SUPERADMIN");

  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPERADMIN"] } },
    orderBy: [{ site: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admins</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Every admin and superadmin account across both Cooachly and Cooachly Arts. Only a
        superadmin can invite, disable, or reset the password of an admin account.
      </p>

      <Card className="mt-6">
        <h2 className="font-semibold">Create a new admin</h2>
        <p className="mt-1 text-sm text-black/60 dark:text-white/60">
          Creates the admin login for the site you choose right away and emails them the login
          link and password.
        </p>
        <div className="mt-4">
          <CreateAdminForm />
        </div>
      </Card>

      <Card className="mt-6 overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
            <tr>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <AdminRow key={admin.id} admin={admin} currentUserId={session.userId} />
            ))}
            {admins.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-black/50 dark:text-white/50">
                  No admin accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
