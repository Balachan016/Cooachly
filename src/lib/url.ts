import "server-only";
import { headers } from "next/headers";

/**
 * The app's own public base URL, for building absolute links in emails/
 * WhatsApp messages. Prefers NEXT_PUBLIC_APP_URL (set this in production —
 * see README), but falls back to the incoming request's own host instead of
 * a hardcoded localhost default, so a deploy that forgot to set it doesn't
 * silently send every link as http://localhost:3000 to real users.
 */
export async function getAppUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;

  try {
    const h = await headers();
    const host = h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // headers() throws outside a request context (e.g. a standalone script).
  }

  return "http://localhost:3000";
}
