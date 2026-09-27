import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { getAvailableSlots, groupSlotsByLocalDay } from "@/lib/scheduling";
import { getProfessorRatingSummary } from "@/lib/reviews";
import { Badge, Card } from "@/components/ui";
import { BookingPicker } from "./booking-picker";

export default async function ProfessorDetailPage(props: PageProps<"/arts/student/professors/[id]">) {
  const { id } = await props.params;

  const user = await getCurrentUser();
  if (!user) return null;

  const professor = await prisma.user.findUnique({
    where: { id, role: "PROFESSOR" },
    include: { professorProfile: true },
  });
  if (!professor || professor.site !== user.site) notFound();

  const [slots, rating] = await Promise.all([
    getAvailableSlots(professor.id),
    getProfessorRatingSummary(professor.id),
  ]);

  const groups = groupSlotsByLocalDay(slots, user.timezone);

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1">
          <h1 className="text-2xl font-semibold">{professor.name}</h1>
          <p className="mt-1 text-brand-700 dark:text-brand-400">{professor.professorProfile?.subject || "Carnatic Vocals"}</p>
          {rating.count > 0 && (
            <p className="mt-1 text-sm text-amber-600 dark:text-amber-400">
              {"★".repeat(Math.round(rating.average))}
              {"☆".repeat(5 - Math.round(rating.average))}{" "}
              <span className="text-black/40 dark:text-white/40">
                {rating.average.toFixed(1)} ({rating.count} review{rating.count === 1 ? "" : "s"})
              </span>
            </p>
          )}
          {professor.professorProfile?.headline && (
            <p className="mt-2 font-medium">{professor.professorProfile.headline}</p>
          )}
          {!!professor.professorProfile?.curricula.length && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {professor.professorProfile.curricula.map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
          )}
          <p className="mt-3 whitespace-pre-line text-sm text-black/70 dark:text-white/70">
            {professor.professorProfile?.bio}
          </p>

          <div className="mt-4 rounded-lg bg-black/5 px-3 py-2 text-sm text-black/60 dark:bg-white/5 dark:text-white/60">
            30-minute classes. Rates aren&apos;t set by the platform — message {professor.name.split(" ")[0]} to discuss pricing directly.
          </div>

          <Link
            href={sitePath(user.site, `/student/messages/${professor.id}`)}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Message {professor.name.split(" ")[0]} →
          </Link>
        </Card>

        <Card className="w-full lg:w-96">
          <h2 className="font-semibold">Book a class</h2>
          <div className="mt-4">
            <BookingPicker professorId={professor.id} groups={groups} timezone={user.timezone} />
          </div>
        </Card>
      </div>
    </div>
  );
}
