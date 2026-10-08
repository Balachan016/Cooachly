"use client";

import Link from "next/link";
import { useTransition } from "react";
import type { User, Role } from "@prisma/client";
import { setUserActive, setUserRole, deleteUserAccount } from "@/actions/admin";
import { sitePath } from "@/lib/site";
import { Badge, Button, Select } from "@/components/ui";

export function UserRow({ user, viewerRole }: { user: User; viewerRole: Role }) {
  const [isPending, startTransition] = useTransition();
  const isElevated = user.role === "ADMIN" || user.role === "SUPERADMIN";
  const canDelete = viewerRole === "SUPERADMIN" && !isElevated;

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
        {isElevated ? (
          <span className="text-xs text-black/40 dark:text-white/40">Only a superadmin can manage this account.</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Link href={sitePath(user.site, `/admin/view-as/${user.id}`)}>
              <Button variant="secondary">View</Button>
            </Link>
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
