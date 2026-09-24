import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt, encrypt, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";
import { sitePath } from "@/lib/site";
import type { Site } from "@prisma/client";

const SITES: Site[] = ["COOACHLY", "ARTS"];
const ROLE_SEGMENTS = [
  { segment: "/admin", role: "ADMIN" },
  { segment: "/professor", role: "PROFESSOR" },
  { segment: "/student", role: "STUDENT" },
] as const;

// Every role-gated prefix for every site, e.g. "/admin", "/arts/admin", "/professor", "/arts/professor", …
const roleRoutePrefixes = SITES.flatMap((site) =>
  ROLE_SEGMENTS.map(({ segment, role }) => ({ site, role, prefix: sitePath(site, segment) }))
);

const authRoutes = SITES.flatMap((site) => [sitePath(site, "/login"), sitePath(site, "/register")]);
const sessionOnlyRoutes = SITES.flatMap((site) => [sitePath(site, "/dashboard"), sitePath(site, "/settings")]);

function siteOf(pathname: string): Site {
  return pathname === "/arts" || pathname.startsWith("/arts/") ? "ARTS" : "COOACHLY";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Redirect the capitalized spelling people naturally type ("/Arts") to the
  // conventional lowercase route. Done here (case-sensitive string match)
  // rather than via next.config.ts `redirects()`, whose source matching is
  // case-insensitive and would otherwise redirect "/arts" to itself in a loop.
  if (pathname === "/Arts" || pathname.startsWith("/Arts/")) {
    const target = new URL(`/arts${pathname.slice("/Arts".length)}${req.nextUrl.search}`, req.url);
    return NextResponse.redirect(target, 308);
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(cookie);

  const currentSite = siteOf(pathname);
  // A session only counts as "logged in" for routes on its own site — an
  // Arts session hitting /admin (Cooachly) is treated as anonymous there,
  // and vice versa. This is what keeps the two platforms' users separate.
  const sessionForSite = session && session.site === currentSite ? session : null;

  const matchedRolePrefix = roleRoutePrefixes.find(
    ({ site, prefix }) => site === currentSite && (pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
  const isAuthRoute = authRoutes.includes(pathname);
  const isSessionOnlyRoute = sessionOnlyRoutes.includes(pathname);

  let response: NextResponse;

  if (matchedRolePrefix && !sessionForSite) {
    const loginUrl = new URL(sitePath(currentSite, "/login"), req.url);
    loginUrl.searchParams.set("next", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (isSessionOnlyRoute && !sessionForSite) {
    const loginUrl = new URL(sitePath(currentSite, "/login"), req.url);
    loginUrl.searchParams.set("next", pathname);
    response = NextResponse.redirect(loginUrl);
  } else if (matchedRolePrefix && sessionForSite && matchedRolePrefix.role !== sessionForSite.role) {
    response = NextResponse.redirect(new URL(roleHomePath(sessionForSite.role, sessionForSite.site), req.url));
  } else if (isAuthRoute && sessionForSite) {
    response = NextResponse.redirect(new URL(roleHomePath(sessionForSite.role, sessionForSite.site), req.url));
  } else {
    response = NextResponse.next();
  }

  // Sliding idle timeout: every authenticated request re-signs the session
  // cookie with a fresh 10-minute expiry, so staying active keeps you logged
  // in but going idle (or closing the browser) logs you out automatically.
  if (session) {
    const refreshed = await encrypt(session);
    response.cookies.set(SESSION_COOKIE_NAME, refreshed, sessionCookieOptions());
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sw.js|offline.html|.*\\.webmanifest$|.*\\.png$).*)"],
};
