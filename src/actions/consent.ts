"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, requireRole, getCurrentUser } from "@/lib/dal";
import { getConsentContentFor, consentCurrentPeriod } from "@/lib/consent";
import { countClauses } from "@/lib/consent-format";
import { roleHomePath } from "@/lib/roles";
import { logAudit } from "@/lib/audit";

export type ConsentActionState = { message?: string; success?: true } | undefined;

/**
 * Called from the consent gate (student/professor layouts, both sites).
 * Re-derives the content and clause count server-side rather than trusting
 * anything the client posted, so what's logged is always exactly what the
 * current template renders to for this person's site+role — the form only
 * has to prove the same number of clauses got checked.
 */
export async function acceptMonthlyConsent(_state: ConsentActionState, formData: FormData): Promise<ConsentActionState> {
  const session = await requireSession();
  if (session.role !== "STUDENT" && session.role !== "PROFESSOR") {
    return { message: "Only students and professors need to accept this." };
  }

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const content = await getConsentContentFor(session.site, session.role);
  const expectedClauseCount = countClauses(content);
  const checkedCount = formData.getAll("acceptedClause").length;
  if (checkedCount < expectedClauseCount) {
    return { message: "Please acknowledge every item before continuing." };
  }

  const { year, month } = consentCurrentPeriod(user.timezone);

  await prisma.consentAcceptance.upsert({
    where: { userId_periodYear_periodMonth: { userId: session.userId, periodYear: year, periodMonth: month } },
    create: { userId: session.userId, site: session.site, role: session.role, periodYear: year, periodMonth: month, content },
    update: { content, acceptedAt: new Date() },
  });

  await logAudit({
    site: session.site,
    action: "CONSENT_ACCEPTED",
    actorId: session.userId,
    targetType: "User",
    targetId: session.userId,
    detail: `${session.role} accepted consent agreement for ${month}/${year}`,
  });

  // Not a redirect: the client calls router.refresh() on success instead,
  // which re-runs the layout server component in place. A redirect() to
  // this same URL (the role's dashboard, where the gate itself is rendered)
  // can serve a stale client-side Router Cache entry for that exact path —
  // router.refresh() always re-fetches.
  revalidatePath(roleHomePath(session.role, session.site));
  return { success: true };
}

export type ConsentTemplateActionState = { message?: string; success?: true } | undefined;

export async function updateConsentTemplate(_state: ConsentTemplateActionState, formData: FormData): Promise<ConsentTemplateActionState> {
  const session = await requireRole("SUPERADMIN");

  const role = formData.get("role");
  if (role !== "STUDENT" && role !== "PROFESSOR") return { message: "Invalid role." };

  const content = formData.get("content");
  if (typeof content !== "string" || content.trim().length === 0) {
    return { message: "Please enter the consent agreement text." };
  }
  if (countClauses(content) === 0) {
    return { message: "No checklist items found — each clause must start with a ☐ line." };
  }

  await prisma.consentTemplate.upsert({
    where: { role },
    create: { role, content, updatedById: session.userId },
    update: { content, updatedById: session.userId },
  });

  await logAudit({
    site: session.site,
    action: "CONSENT_TEMPLATE_UPDATED",
    actorId: session.userId,
    detail: `Updated the ${role} consent agreement template`,
  });

  revalidatePath("/superadmin/settings");
  return { message: `Updated the ${role.toLowerCase()} consent agreement.`, success: true };
}
