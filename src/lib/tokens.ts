import "server-only";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sitePath } from "@/lib/site";
import { getAppUrl } from "@/lib/url";
import type { Site } from "@prisma/client";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a fresh password-reset token for an existing user and returns the
 * absolute link to set a new password — lets us hand someone a secure way
 * to create their own login instead of emailing a temporary password in
 * plaintext.
 */
export async function createPasswordSetupLink(site: Site, userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) },
  });
  const appUrl = await getAppUrl();
  return `${appUrl}${sitePath(site, `/reset-password/${rawToken}`)}`;
}
