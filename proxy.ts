import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/session";

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (PRD 9.3 still shows the old
 * name). Functionality is unchanged.
 *
 * This performs an OPTIMISTIC check only: it looks for the presence of the
 * session cookie to avoid rendering the app shell for obviously-anonymous
 * visitors. It does NOT verify the token and is NOT the authorization layer —
 * the Next.js docs explicitly warn against using proxy for session management.
 *
 * Every API route independently calls `requireUser()` and its permission
 * guards, which re-read the user from the database (PRD 10.1: permissions are
 * checked on the server, not by hiding UI).
 */
export function proxy(request: NextRequest) {
  const hasSessionCookie = request.cookies.has(SESSION_COOKIE);
  const { pathname } = request.nextUrl;

  if (!hasSessionCookie && pathname.startsWith("/app")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSessionCookie && pathname === "/login") {
    return NextResponse.redirect(new URL("/app/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // API routes are intentionally excluded: they return JSON 401s from their own
  // guards rather than being redirected to an HTML login page.
  matcher: ["/app/:path*", "/login"],
};
