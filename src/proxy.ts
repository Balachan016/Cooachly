import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt, SESSION_COOKIE_NAME } from "@/lib/session";
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

  if (protectedPrefix && session && roleRoutePrefix[session.role] !== protectedPrefix) {
    return NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  }

  if (pathname === "/dashboard" && session) {
    return NextResponse.redirect(new URL(roleHomePath(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
