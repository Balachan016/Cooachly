"use server";

import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";
import { isAllowedPushEndpoint } from "@/lib/notifications/push";
import { forgetPushDevice, rememberPushDevice } from "@/lib/notifications/push-device";

const SubscriptionSchema = z.object({
  endpoint: z.url().refine(isAllowedPushEndpoint, "Unsupported push service"),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

export async function savePushSubscription(input: unknown, userAgent?: string) {
  const session = await requireSession();

  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "This browser's push service isn't supported." };

  const { endpoint, keys } = parsed.data;
  // Upsert on endpoint: a device that was previously subscribed under another
  // account on the same browser moves to whoever is signed in now.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 500) },
    update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 500) },
  });
  await rememberPushDevice(session.site, endpoint);

  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const session = await requireSession();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.userId } });
  await forgetPushDevice(session.site);
  return { ok: true as const };
}

/**
 * Whether this browser's subscription is registered to the signed-in user.
 * After someone else logs out on a shared device the browser still holds a
 * subscription, but it no longer belongs to anyone until turned on again.
 */
export async function isPushSubscriptionMine(endpoint: string) {
  const session = await requireSession();
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint }, select: { userId: true } });
  return sub?.userId === session.userId;
}
