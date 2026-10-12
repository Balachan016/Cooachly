"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { User, Role } from "@prisma/client";
import { setUserActive, setUserRole, deleteUserAccount } from "@/actions/admin";
import { sitePath } from "@/lib/site";
import { Badge, Button, Select } from "@/components/ui";
import { SwitchToUserButton } from "@/components/switch-to-user-button";

export function UserRow({
  user,
  viewerRole,
  currentUserId,
}: {
  user: User;
  viewerRole: Role;
  currentUserId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const isElevated = user.role === "ADMIN" || user.role === "SUPERADMIN";
  const isSelf = user.id === currentUserId;
  // A superadmin can manage admin/superadmin accounts too (the server
  // actions already allow this) — only a plain admin is locked out of
  // elevated rows, and nobody can act on their own row here (self-disable
  // and self-delete are blocked server-side anyway).
  const viewerCanManage = !isSelf && (!isElevated || viewerRole === "SUPERADMIN");
  // deleteUserAccount refuses a SUPERADMIN target outright ("can't be
  // deleted this way"), so the button isn't offered for one.
  const canDelete = viewerRole === "SUPERADMIN" && !isSelf && user.role !== "SUPERADMIN";
  // /admin/view-as and switch-to-user both only work for student/professor
  // targets — showing them for an admin/superadmin row would just 404 or
  // get rejected server-side.
  const canViewOrSwitch = !isElevated;

  function handleDelete() {
    const confirmed = window.confirm(
      `Permanently delete ${user.name}'s account? This also deletes every booking, message, and review they're part of — including the other side of any conversation or review with someone else. This cannot be undone.`
    );
    if (!confirmed) return;
    startTransition(() => {
      void deleteUserAccount(user.id);
    });
  }

  return (
    <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
      <td className="px-4 py-3 font-mono text-xs text-black/60 dark:text-white/60">{user.code ?? "—"}</td>
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td className="px-4 py-3 text-black/60 dark:text-white/60">{user.email}</td>
      <td className="px-4 py-3">
        {isElevated ? (
          <Badge>{user.role}</Badge>
        ) : (
          <Select
            defaultValue={user.role}
            disabled={isPending}
            onChange={(e) => startTransition(() => setUserRole(user.id, e.target.value as Role))}
            className="w-auto"
          >
            <option value="STUDENT">Student</option>
            <option value="PROFESSOR">Professor</option>
            <option value="ADMIN">Admin</option>
          </Select>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Disabled"}</Badge>
      </td>
      <td className="px-4 py-3 text-black/60 dark:text-white/60">
        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(user.createdAt)}
      </td>
      <td className="px-4 py-3">
        {isSelf ? (
          <span className="text-xs text-black/40 dark:text-white/40">This is your own account.</span>
        ) : !viewerCanManage ? (
          <span className="text-xs text-black/40 dark:text-white/40">Only a superadmin can manage this account.</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {canViewOrSwitch && (
              <Link href={sitePath(user.site, `/admin/view-as/${user.id}`)}>
                <Button variant="secondary">View</Button>
              </Link>
            )}
            {canViewOrSwitch && user.isActive && <SwitchToUserButton userId={user.id} />}
            <Link href={sitePath(user.site, `/admin/users/${user.id}`)}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <Button
              variant={user.isActive ? "danger" : "secondary"}
              disabled={isPending}
              onClick={() => startTransition(() => setUserActive(user.id, !user.isActive))}
            >
              {user.isActive ? "Disable" : "Enable"}
            </Button>
            {canDelete && (
              <Button variant="danger" disabled={isPending} onClick={handleDelete}>
                Delete
              </Button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
