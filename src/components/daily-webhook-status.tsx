import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/dal";
import { checkDailyWebhook, isTranscriptionEnabled, type DailyWebhookHealth } from "@/lib/daily";
import { Button } from "@/components/ui";

async function repairDailyWebhook() {
  "use server";
  await requireRole("ADMIN", "SUPERADMIN");
  await checkDailyWebhook({ repair: true });
  revalidatePath("/admin/class-logs");
  revalidatePath("/arts/admin/class-logs");
}

function describe(health: DailyWebhookHealth): string | null {
  switch (health.status) {
    case "not-configured":
    case "active":
    case "repaired":
      return null;
    case "missing":
      return "No webhook is set up in Daily.co, so attendance and AI summaries can't be recorded. Add one pointing at /api/daily/webhook in Daily's dashboard (Developers → Webhooks).";
    case "unhealthy": {
      const parts = [];
      if (health.state === "FAILED") {
        parts.push(`Daily.co has paused the webhook after ${health.failedCount ?? "several"} failed deliveries`);
      }
      if (health.missingEvents.length) parts.push(`it isn't subscribed to ${health.missingEvents.join(", ")}`);
      return `${parts.join(" and ")}. Until this is fixed, new calls get no attendance or AI summary. It's re-activated automatically every 5 minutes by the reminder job, or use the button now.`;
    }
    case "error":
      return `Couldn't check the Daily.co webhook (${health.error}).`;
  }
}

/** Warns on Class logs when Daily isn't delivering the events attendance and summaries depend on. */
export async function DailyWebhookStatus() {
  const health = await checkDailyWebhook({ repair: false });
  const problem = describe(health);
  if (!problem) {
    return isTranscriptionEnabled || health.status === "not-configured" ? null : (
      <p className="mt-4 rounded-lg border border-black/10 p-3 text-sm text-black/60 dark:border-white/10 dark:text-white/60">
        Live transcription is off (<code>DAILY_ENABLE_TRANSCRIPTION</code> isn&apos;t &quot;true&quot;), so calls get attendance but no AI summary.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-semibold">Video call attendance and AI summaries are paused</p>
      <p className="mt-1">{problem}</p>
      {health.status === "unhealthy" && (
        <form action={repairDailyWebhook} className="mt-3">
          <Button type="submit" variant="secondary">
            Repair now
          </Button>
        </form>
      )}
    </div>
  );
}
