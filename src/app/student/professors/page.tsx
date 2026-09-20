import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { Badge, Card, Select } from "@/components/ui";
import { curriculumOptionsForSite } from "@/lib/curricula";
import { getProfessorRatingSummaries } from "@/lib/reviews";

export default async function BrowseProfessorsPage(props: PageProps<"/student/professors">) {
  const session = await requireRole("STUDENT");
  const searchParams = await props.searchParams;
  const curriculum = typeof searchParams.curriculum === "string" ? searchParams.curriculum : "";
  const curriculumOptions = curriculumOptionsForSite(session.site);

  const where: Prisma.UserWhereInput = {
    role: "PROFESSOR",
    isActive: true,
    site: session.site,
    ...(curriculum ? { professorProfile: { curricula: { has: curriculum } } } : {}),
  };

  const professors = await prisma.user.findMany({
    where,
    include: { professorProfile: true },
    orderBy: { createdAt: "desc" },
  });
  const ratings = await getProfessorRatingSummaries(professors.map((p) => p.id));

  return (
    <div>
      <h1 className="text-2xl font-semibold">Find a professor</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">Browse professors and book a session.</p>

      <form method="get" className="mt-4 max-w-xs">
        <Select name="curriculum" defaultValue={curriculum} onChange={(e) => e.currentTarget.form?.submit()}>
          <option value="">All curricula</option>
          {curriculumOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </Select>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professors.map((p) => (
          <Link key={p.id} href={sitePath(session.site, `/student/professors/${p.id}`)}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-brand-700 dark:text-brand-400">{p.professorProfile?.subject || "Coaching"}</p>
              {ratings.get(p.id)?.count ? (
                <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
                  {"★".repeat(Math.round(ratings.get(p.id)!.average))}
                  {"☆".repeat(5 - Math.round(ratings.get(p.id)!.average))}{" "}
                  <span className="text-black/40 dark:text-white/40">({ratings.get(p.id)!.count})</span>
                </p>
              ) : null}
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">{p.professorProfile?.headline}</p>
              {!!p.professorProfile?.curricula.length && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.professorProfile.curricula.map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
              )}
              <p className="mt-3 text-sm font-medium">
                ${((p.professorProfile?.hourlyRateCents ?? 0) / 100).toFixed(2)} / session
              </p>
            </Card>
          </Link>
        ))}
        {professors.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">No professors match this filter yet.</p>
        )}
      </div>
    </div>
  );
}
