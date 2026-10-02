import "server-only";
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Values pasted into a hosting dashboard often pick up stray quotes or
// whitespace; strip them so they don't break key decoding.
function envValue(name: string) {
  return process.env[name]?.trim().replace(/^["']|["']$/g, "") || undefined;
}

const publicKey = envValue("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
const privateKey = envValue("VAPID_PRIVATE_KEY");
const subject = envValue("VAPID_SUBJECT") || "mailto:support@cooachly.com";

// setVapidDetails throws on a malformed key or subject. Catch it so a bad
// env value disables push (with a clear log line) instead of crashing every
// server action and the reminder cron that import this module.
function configureVapid(): boolean {
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    return true;
  } catch (err) {
    console.error("Push notifications disabled: invalid VAPID settings", err);
    return false;
  }
}

export const isPushConfigured = configureVapid();

// Browsers hand us the push service URL to deliver to. Only ever send to the
// real browser push services, so a forged subscription can't make the
// server POST to arbitrary hosts.
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge, Android
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /^web\.push\.apple\.com$/, // Safari, iOS home-screen apps
  /\.notify\.windows\.com$/, // legacy Edge / Windows
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
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
      if (!isAllowedPushEndpoint(sub.endpoint)) return;
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, body, {
          TTL: 24 * 60 * 60, // drop it if the device stays offline for a day
          timeout: 10_000,
        });
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
