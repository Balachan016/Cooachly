import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/dal";
import { sitePath } from "@/lib/site";
import { getAvailableSlots, groupSlotsByLocalDay } from "@/lib/scheduling";
import { getProfessorRatingSummary } from "@/lib/reviews";
import { subscribeToProfessor } from "@/actions/billing";
import { Badge, Button, Card } from "@/components/ui";
import { BookingPicker } from "./booking-picker";

export default async function ProfessorDetailPage(props: PageProps<"/arts/student/professors/[id]">) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;

  const user = await getCurrentUser();
  if (!user) return null;

  const professor = await prisma.user.findUnique({
    where: { id, role: "PROFESSOR" },
    include: { professorProfile: true },
  });
  if (!professor || professor.site !== user.site) notFound();

  const [slots, subscription, rating] = await Promise.all([
    getAvailableSlots(professor.id),
    prisma.subscription.findFirst({
      where: { studentId: user.id, professorId: professor.id, status: "ACTIVE", currentPeriodEnd: { gt: new Date() } },
    }),
    getProfessorRatingSummary(professor.id),
  ]);

  const groups = groupSlotsByLocalDay(slots, user.timezone);
  const errorParam = typeof searchParams.error === "string" ? searchParams.error : null;

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <Card className="flex-1">
          <h1 className="text-2xl font-semibold">{professor.name}</h1>
          <p className="mt-1 text-brand-700 dark:text-brand-400">{professor.professorProfile?.subject || "Coaching"}</p>
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

          <div className="mt-4 flex items-center gap-3">
            <span className="text-lg font-semibold">
              ${((professor.professorProfile?.hourlyRateCents ?? 0) / 100).toFixed(2)}
            </span>
            <span className="text-sm text-black/50 dark:text-white/50">
              / 60-minute session (final price shown per slot below)
            </span>
          </div>

          <Link
            href={sitePath(user.site, `/student/messages/${professor.id}`)}
            className="mt-3 inline-block text-sm font-medium text-brand-700 hover:underline dark:text-brand-400"
          >
            Message {professor.name.split(" ")[0]} →
          </Link>

          {professor.professorProfile?.monthlyPriceCents ? (
            <div className="mt-6 border-t border-black/10 pt-4 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Monthly subscription</div>
                  <div className="text-sm text-black/50 dark:text-white/50">
                    ${(professor.professorProfile.monthlyPriceCents / 100).toFixed(2)} / month — unlimited sessions
                  </div>
                </div>
                {subscription ? (
                  <Badge tone="success">Subscribed</Badge>
                ) : (
                  <form action={subscribeToProfessor.bind(null, professor.id)}>
                    <Button type="submit" variant="secondary">
                      Subscribe
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ) : null}

          {errorParam === "stripe-not-configured" && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
              Payments aren&apos;t configured on this instance yet.
            </p>
          )}
          {errorParam === "no-subscription-plan" && (
            <p className="mt-4 text-sm text-amber-600 dark:text-amber-400">
              This professor hasn&apos;t set up a subscription plan.
            </p>
          )}
        </Card>

        <Card className="w-full lg:w-96">
          <h2 className="font-semibold">Book a session</h2>
          <div className="mt-4">
            <BookingPicker professorId={professor.id} groups={groups} timezone={user.timezone} />
          </div>
        </Card>
      </div>
    </div>
  );
}
