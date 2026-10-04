import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/dal";
import { summarizeRatings, type RatingSummary } from "@/lib/reviews";
import { Badge, Card } from "@/components/ui";

function RatingSummaryTable({ title, rows }: { title: string; rows: RatingSummary[] }) {
  return (
    <Card className="overflow-x-auto p-0">
      <h2 className="p-4 pb-0 font-semibold">{title}</h2>
      <table className="mt-2 w-full text-left text-sm">
        <thead className="border-b border-black/10 text-xs uppercase text-black/50 dark:border-white/10 dark:text-white/50">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Overall rating</th>
            <th className="px-4 py-3 text-right">Reviews</th>
            <th className="px-4 py-3 text-right">Joined on time</th>
            <th className="px-4 py-3 text-right">Explained clearly</th>
            <th className="px-4 py-3 text-right">Stayed on topic</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.userId} className="border-b border-black/5 last:border-0 dark:border-white/5">
              <td className="px-4 py-3 font-medium">{r.name}</td>
              <td className="px-4 py-3">
                <span className="text-amber-500">{"★".repeat(Math.round(r.average))}</span>
                <span className="text-black/20 dark:text-white/20">{"★".repeat(5 - Math.round(r.average))}</span>
                <span className="ml-1.5 text-black/50 dark:text-white/50">{r.average.toFixed(1)}</span>
              </td>
              <td className="px-4 py-3 text-right">{r.count}</td>
              <td className="px-4 py-3 text-right">{r.joinedOnTimePct == null ? "—" : `${r.joinedOnTimePct}%`}</td>
              <td className="px-4 py-3 text-right">{r.explainedClearlyPct == null ? "—" : `${r.explainedClearlyPct}%`}</td>
              <td className="px-4 py-3 text-right">{r.stayedOnTopicPct == null ? "—" : `${r.stayedOnTopicPct}%`}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-6 text-center text-black/50 dark:text-white/50">
                No feedback received yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </Card>
  );
}

function yesNoBadge(label: string, value: boolean | null) {
  if (value === null) return null;
  return (
    <Badge tone={value ? "success" : "danger"}>
      {label}: {value ? "Yes" : "No"}
    </Badge>
  );
}

export default async function AdminFeedbackPage() {
  const session = await requireRole("ADMIN", "SUPERADMIN");

  const reviews = await prisma.review.findMany({
    where: { rater: { site: session.site } },
    orderBy: { createdAt: "desc" },
    include: {
      rater: true,
      ratee: true,
      booking: { select: { startAt: true, notes: true } },
    },
  });

  const professorReviews = reviews.filter((r) => r.ratee.role === "PROFESSOR");
  const studentReviews = reviews.filter((r) => r.ratee.role === "STUDENT");

  const professorSummaries = summarizeRatings(professorReviews);
  const studentSummaries = summarizeRatings(studentReviews);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Feedback</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Post-class feedback students and gurus leave about each other, plus their overall ratings.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <RatingSummaryTable title="Guru ratings" rows={professorSummaries} />
        <RatingSummaryTable title="Student ratings" rows={studentSummaries} />
      </div>

      <Card className="mt-6 p-0">
        <h2 className="p-4 pb-0 font-semibold">Individual feedback</h2>
        <div className="mt-2 divide-y divide-black/5 dark:divide-white/5">
          {reviews.map((r) => (
            <div key={r.id} className="p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="font-medium">
                  {r.rater.name} <span className="text-black/40 dark:text-white/40">rated</span> {r.ratee.name}
                </div>
                <div className="text-xs text-black/50 dark:text-white/50">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(r.createdAt)}
                </div>
              </div>
              {r.booking && (
                <div className="text-xs text-black/50 dark:text-white/50">
                  Class: {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(r.booking.startAt)}
                  {r.booking.notes ? ` · ${r.booking.notes}` : ""}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                <span className="text-black/20 dark:text-white/20">{"★".repeat(5 - r.rating)}</span>
                {yesNoBadge("Joined on time", r.joinedOnTime)}
                {yesNoBadge("Explained clearly", r.explainedClearly)}
                {yesNoBadge("Stayed on topic", r.stayedOnTopic)}
              </div>
              {r.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-black/70 dark:text-white/70">{r.comment}</p>
              )}
            </div>
          ))}
          {reviews.length === 0 && (
            <p className="p-6 text-sm text-black/50 dark:text-white/50">No feedback submitted yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
