import { NextResponse, type NextRequest } from "next/server";
import { cookieSecure } from "@/lib/cookie-secure";
import { SESSION_COOKIE } from "@/lib/session-token";

/**
 * Clears a stale session cookie (e.g. after db seed wiped users)
 * then redirects to login — avoids /login ↔ /app redirect loops.
 */
export async function GET(request: NextRequest) {
  const next = request.nextUrl.searchParams.get("next") ?? "/login";
  const safeNext =
    next.startsWith("/") && !next.startsWith("//") ? next : "/login";

  const response = NextResponse.redirect(new URL(safeNext, request.url));
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
