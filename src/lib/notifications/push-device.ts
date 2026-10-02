import "server-only";
import { cookies } from "next/headers";
import type { Site } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Remembers which push subscription belongs to this browser, per site, so
// logging out can stop that device receiving the signed-out user's
// notifications (e.g. a phone shared between siblings or a parent).
function cookieName(site: Site) {
  return `push_endpoint_${site.toLowerCase()}`;
}

export async function rememberPushDevice(site: Site, endpoint: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName(site), endpoint, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function forgetPushDevice(site: Site) {
  const cookieStore = await cookies();
  cookieStore.delete(cookieName(site));
}

/** Detaches this browser's push subscription from whoever was signed in. */
export async function removeThisDevicesPushSubscription(site: Site, userId: string) {
  const cookieStore = await cookies();
  const endpoint = cookieStore.get(cookieName(site))?.value;
  if (!endpoint) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  cookieStore.delete(cookieName(site));
}
