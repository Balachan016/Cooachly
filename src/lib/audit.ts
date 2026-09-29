import "server-only";
import { prisma } from "@/lib/prisma";
import type { AuditAction, Site } from "@prisma/client";

export async function logAudit(opts: {
  site: Site;
  action: AuditAction;
  actorId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  detail?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      site: opts.site,
      action: opts.action,
      actorId: opts.actorId ?? null,
      targetType: opts.targetType ?? null,
      targetId: opts.targetId ?? null,
      detail: opts.detail ?? null,
    },
  });
}
