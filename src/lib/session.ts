import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role, Site } from "@prisma/client";

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) {
  throw new Error("SESSION_SECRET environment variable is not set");
}
const encodedKey = new TextEncoder().encode(secretKey);

const SESSION_COOKIE = "cooachly_session";
// Idle timeout: the session expires 10 minutes after the last request. Every
// authenticated request re-signs the cookie with a fresh expiry (see
// src/proxy.ts), so staying active keeps you logged in indefinitely, but
// closing the tab or walking away logs you out automatically.
const SESSION_IDLE_DURATION_MS = 10 * 60 * 1000;

export type SessionPayload = {
  userId: string;
  role: Role;
  site: Site;
  name: string;
  email: string;
};

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_IDLE_DURATION_MS) / 1000))
    .sign(encodedKey);
}

export async function decrypt(session: string | undefined = ""): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const session = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, session, sessionCookieOptions());
}

export async function getSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_IDLE_DURATION_MS / 1000,
    sameSite: "lax" as const,
    path: "/",
  };
}
