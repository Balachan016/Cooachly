import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt, encrypt, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/session";
import { roleHomePath } from "@/lib/roles";

const roleRoutePrefix: Record<string, string> = {
  ADMIN: "/admin",
  PROFESSOR: "/professor",
  STUDENT: "/student",
};

const authRoutes = ["/login", "/register"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decrypt(cookie);

  const isAuthRoute = authRoutes.includes(pathname);
  const protectedPrefix = Object.values(roleRoutePrefix).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (protectedPrefix && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let response: NextResponse;

  if (protectedPrefix && session && roleRoutePrefix[session.role] !== protectedPrefix) {
    response = NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  } else if (isAuthRoute && session) {
    response = NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  } else if (pathname === "/dashboard" && session) {
    response = NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
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
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
