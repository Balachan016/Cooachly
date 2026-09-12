import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui";

export default async function BrowseProfessorsPage() {
  const professors = await prisma.user.findMany({
    where: { role: "PROFESSOR", isActive: true },
    include: { professorProfile: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Find a professor</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">Browse professors and book a session.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {professors.map((p) => (
          <Link key={p.id} href={`/student/professors/${p.id}`}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <h2 className="font-semibold">{p.name}</h2>
              <p className="mt-1 text-sm text-indigo-600 dark:text-indigo-400">{p.professorProfile?.subject || "Coaching"}</p>
              <p className="mt-2 text-sm text-black/60 dark:text-white/60">{p.professorProfile?.headline}</p>
              <p className="mt-3 text-sm font-medium">
                ${((p.professorProfile?.hourlyRateCents ?? 0) / 100).toFixed(2)} / session
              </p>
            </Card>
          </Link>
        ))}
        {professors.length === 0 && (
          <p className="text-sm text-black/50 dark:text-white/50">No professors have joined yet.</p>
        )}
      </div>
    </div>
  );
}
