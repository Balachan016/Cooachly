"use server";

import * as z from "zod";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/dal";

const SubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

export async function savePushSubscription(input: unknown, userAgent?: string) {
  const session = await requireSession();

  const parsed = SubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, message: "Invalid push subscription." };

  const { endpoint, keys } = parsed.data;
  // Upsert on endpoint: a device that was previously subscribed under another
  // account on the same browser moves to whoever is signed in now.
  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: { userId: session.userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 500) },
    update: { userId: session.userId, p256dh: keys.p256dh, auth: keys.auth, userAgent: userAgent?.slice(0, 500) },
  });

  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  const session = await requireSession();
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.userId } });
  return { ok: true as const };
}
