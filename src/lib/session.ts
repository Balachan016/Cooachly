import "server-only";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
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
  // Set only while an admin is "switched in" as this user — the admin's own
  // id/name, so the UI can show a "Return to admin" banner and the return
  // action knows who to switch back to, without a DB lookup on every page.
  impersonatorId?: string;
  impersonatorName?: string;
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

/**
 * Used only by proxy.ts to notice a session the moment its idle timeout
 * lapses. jose verifies the signature before checking "exp", so a
 * JWTExpired error's payload is just as trustworthy as decrypt()'s — it's
 * not a guess about who it was. Returns null for anything else (no cookie,
 * wrong key, tampered token, or a still-valid session).
 */
export async function decryptIfExpired(session: string | undefined = ""): Promise<SessionPayload | null> {
  if (!session) return null;
  try {
    await jwtVerify(session, encodedKey, { algorithms: ["HS256"] });
    return null;
  } catch (err) {
    return err instanceof joseErrors.JWTExpired ? (err.payload as unknown as SessionPayload) : null;
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
