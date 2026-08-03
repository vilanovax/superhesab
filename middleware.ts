import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

/**
 * Protects app routes and invite landing.
 * Unauthenticated invite visits → /login?callbackUrl=/invite/[id]
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected =
    pathname.startsWith("/app") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/spaces") ||
    pathname.startsWith("/invite");

  if (!isProtected) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    const callback = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("callbackUrl", callback);
    // Keep legacy `next` for older links
    loginUrl.searchParams.set("next", callback);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin",
    "/admin/:path*",
    "/dashboard/:path*",
    "/spaces/:path*",
    "/invite/:path*",
  ],
};
