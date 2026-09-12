"use client";

import { useTransition } from "react";
import type { User, Role } from "@prisma/client";
import { setUserActive, setUserRole } from "@/actions/admin";
import { Badge, Button, Select } from "@/components/ui";

export function UserRow({ user }: { user: User }) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="border-b border-black/5 last:border-0 dark:border-white/5">
      <td className="px-4 py-3 font-medium">{user.name}</td>
      <td className="px-4 py-3 text-black/60 dark:text-white/60">{user.email}</td>
      <td className="px-4 py-3">
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
      </td>
      <td className="px-4 py-3">
        <Badge tone={user.isActive ? "success" : "danger"}>{user.isActive ? "Active" : "Disabled"}</Badge>
      </td>
      <td className="px-4 py-3 text-black/60 dark:text-white/60">
        {new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(user.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Button
          variant={user.isActive ? "danger" : "secondary"}
          disabled={isPending}
          onClick={() => startTransition(() => setUserActive(user.id, !user.isActive))}
        >
          {user.isActive ? "Disable" : "Enable"}
        </Button>
      </td>
    </tr>
  );
}
