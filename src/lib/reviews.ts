import { prisma } from "@/lib/prisma";

export async function getProfessorRatingSummaries(professorIds: string[]) {
  if (professorIds.length === 0) return new Map<string, { average: number; count: number }>();

  const grouped = await prisma.review.groupBy({
    by: ["rateeId"],
    where: { rateeId: { in: professorIds } },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return new Map(
    grouped.map((g) => [g.rateeId, { average: g._avg.rating ?? 0, count: g._count.rating }])
  );
}

export async function getProfessorRatingSummary(professorId: string) {
  const summaries = await getProfessorRatingSummaries([professorId]);
  return summaries.get(professorId) ?? { average: 0, count: 0 };
}

export type RatingSummary = {
  userId: string;
  name: string;
  average: number;
  count: number;
  joinedOnTimePct: number | null;
  explainedClearlyPct: number | null;
  stayedOnTopicPct: number | null;
};

/**
 * Aggregates every review a set of people received into per-person
 * summaries: average star rating, count, and the share of "Yes" answers on
 * each of the three post-call questions (null if nobody answered that
 * question for them). Used by the admin Feedback page to show overall
 * ratings for both professors and students from the same review data.
 */
export function summarizeRatings(
  reviews: { rateeId: string; ratee: { name: string }; rating: number; joinedOnTime: boolean | null; explainedClearly: boolean | null; stayedOnTopic: boolean | null }[]
): RatingSummary[] {
  const byRatee = new Map<string, typeof reviews>();
  for (const r of reviews) {
    const list = byRatee.get(r.rateeId) ?? [];
    list.push(r);
    byRatee.set(r.rateeId, list);
  }

  const yesPct = (values: (boolean | null)[]) => {
    const answered = values.filter((v): v is boolean => v !== null);
    if (answered.length === 0) return null;
    return Math.round((answered.filter(Boolean).length / answered.length) * 100);
  };

  return Array.from(byRatee.entries())
    .map(([userId, list]) => ({
      userId,
      name: list[0].ratee.name,
      average: list.reduce((sum, r) => sum + r.rating, 0) / list.length,
      count: list.length,
      joinedOnTimePct: yesPct(list.map((r) => r.joinedOnTime)),
      explainedClearlyPct: yesPct(list.map((r) => r.explainedClearly)),
      stayedOnTopicPct: yesPct(list.map((r) => r.stayedOnTopic)),
    }))
    .sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));
}
