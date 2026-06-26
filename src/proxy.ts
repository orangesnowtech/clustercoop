/**
 * Proxy (Next 16's renamed middleware) — OPTIMISTIC route gating (Edge runtime).
 *
 * firebase-admin can't run on the Edge, so this does NOT cryptographically
 * verify the session cookie. It checks presence and decodes the (unverified)
 * `role` claim purely to route users to the right area and bounce obvious
 * mismatches early. The AUTHORITATIVE checks are server-side
 * (verifySessionCookie in Server Components) and in Firestore rules. Never rely
 * on this layer alone for security.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { AUTH_PAGES, guardForPath, homeForRole } from "@/lib/auth/routes";
import { isRole, type Role } from "@/lib/roles";

/** Decode a JWT payload without verifying it (Edge-safe, optimistic only). */
function decodeRole(jwt: string): Role | undefined {
  const part = jwt.split(".")[1];
  if (!part) return undefined;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
    const json = JSON.parse(atob(b64 + pad));
    return isRole(json.role) ? json.role : undefined;
  } catch {
    return undefined;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const role = cookie ? decodeRole(cookie) : undefined;

  // Signed-in users shouldn't sit on auth pages — send them home.
  if (AUTH_PAGES.includes(pathname) && cookie) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  const guard = guardForPath(pathname);
  if (!guard) return NextResponse.next();

  // Protected area, no session → login (remember where they were going).
  if (!cookie) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Wrong role for this area → send to their own home.
  if (!role || !guard.roles.includes(role)) {
    return NextResponse.redirect(new URL(homeForRole(role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals, the auth API, and static files.
  matcher: ["/((?!_next/static|_next/image|api|favicon.ico|.*\\..*).*)"],
};
