import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { decrypt, getSessionCookie } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const verifySession = cache(async () => {
  const cookie = await getSessionCookie();
  const session = await decrypt(cookie);

  if (!session?.userId) {
    return null;
  }

  return session;
});

export const requireSession = cache(async () => {
  const session = await verifySession();
  if (!session) {
    redirect("/login");
  }
  return session;
});

export const requireRole = cache(async (...roles: Role[]) => {
  const session = await requireSession();
  if (!roles.includes(session.role)) {
    redirect("/dashboard");
  }
  return session;
});

export const getCurrentUser = cache(async () => {
  const session = await verifySession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { professorProfile: true },
  });

  if (!user || !user.isActive) return null;
  return user;
});
