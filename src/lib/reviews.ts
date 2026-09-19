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
