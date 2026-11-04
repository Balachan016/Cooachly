import { prisma } from "@/lib/prisma";
import { Badge, Card } from "@/components/ui";

const RECENT_COUNT = 10;

/**
 * Not site-scoped — Daily's webhook delivery (and its circuit breaker) is
 * one shared pipeline across both sites, so this reads the same recent
 * deliveries regardless of which admin is looking. A long gap since the
 * last delivery, or a run of failures, is exactly the failure mode that
 * once silently broke session summaries for a while before anyone noticed.
 */
export async function DailyWebhookHealth() {
  const events = await prisma.dailyWebhookEvent.findMany({
    orderBy: { receivedAt: "desc" },
    take: RECENT_COUNT,
  });
  const last = events[0];
  const recentFailures = events.filter((e) => !e.ok).length;
  const formatTime = (d: Date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(d);

  return (
    <Card className="mt-6">
      <h2 className="font-semibold">Daily webhook health</h2>
      <p className="mt-1 text-sm text-black/50 dark:text-white/50">
        Whether Daily.co&apos;s webhook deliveries (call join/leave, transcripts) are reaching this app. A long gap
        since the last delivery, or a run of failures below, usually means the circuit breaker has tripped — see the
        README for how to reset it.
      </p>

      {last ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
          <Badge tone={last.ok ? "success" : "danger"}>{last.ok ? "Healthy" : "Last delivery failed"}</Badge>
          <span className="text-black/60 dark:text-white/60">
            Last delivery: {last.type} · {formatTime(last.receivedAt)}
          </span>
          {recentFailures > 0 && (
            <span className="text-red-600 dark:text-red-400">
              {recentFailures} of last {events.length} failed
            </span>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-black/50 dark:text-white/50">No webhook deliveries recorded yet.</p>
      )}

      {events.length > 0 && (
        <div className="mt-4 divide-y divide-black/5 text-sm dark:divide-white/5">
          {events.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span className="font-medium">{e.type}</span>
              <span className="text-black/50 dark:text-white/50">{formatTime(e.receivedAt)}</span>
              <Badge tone={e.ok ? "success" : "danger"}>{e.ok ? "OK" : e.error ?? "Failed"}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
