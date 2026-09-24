import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || "mailto:support@cooachly.com";

export const isPushConfigured = Boolean(publicKey && privateKey);

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export type PushPayload = {
  title: string;
  body: string;
  /** App-relative path (or absolute URL) to open when the notification is tapped. */
  url?: string;
  /** Notifications sharing a tag replace each other instead of stacking. */
  tag?: string;
};

/**
 * Sends a Web Push notification to every device the user has enabled.
 * Subscriptions the push service reports as gone (404/410 — the user
 * uninstalled the app or revoked permission) are deleted.
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  if (!isPushConfigured) {
    console.log(`[push:skipped, not configured] user=${userId} title="${payload.title}"`);
    return { skipped: true as const };
  }

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return { skipped: true as const };

  const body = JSON.stringify(payload);
  const errors: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body);
      } catch (err) {
        const statusCode = err && typeof err === "object" && "statusCode" in err ? (err as { statusCode: number }).statusCode : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
          return;
        }
        console.error("Failed to send push notification", err);
        errors.push(err instanceof Error ? err.message : String(err));
      }
    })
  );

  return errors.length > 0 ? { skipped: false as const, error: errors.join("; ") } : { skipped: false as const };
}
