/**
 * Route guard map — edge-safe (imported by middleware).
 *
 * Coarse, UX-level gating only: which roles may *see* a route area. The
 * authoritative checks live in server components (verifySessionCookie) and
 * Firestore rules. Fine-grained per-action rules (e.g. only `accounts` may
 * post to the ledger) are enforced server-side, not here.
 */
import { STAFF_ROLES, type Role } from "@/lib/roles";

export interface RouteGuard {
  /** Path prefix this guard applies to. */
  prefix: string;
  /** Roles permitted into this area. */
  roles: Role[];
}

/** First matching prefix wins; anything unmatched is public. */
export const ROUTE_GUARDS: RouteGuard[] = [
  { prefix: "/admin", roles: STAFF_ROLES },
  { prefix: "/dashboard", roles: ["customer"] },
  { prefix: "/onboarding", roles: ["customer"] },
];

/** Auth pages — redirect away if already signed in. */
export const AUTH_PAGES = ["/login", "/register", "/forgot-password"];

export function guardForPath(pathname: string): RouteGuard | null {
  return (
    ROUTE_GUARDS.find(
      (g) => pathname === g.prefix || pathname.startsWith(g.prefix + "/"),
    ) ?? null
  );
}

/** Where a signed-in user of this role belongs by default. */
export function homeForRole(role: Role | undefined): string {
  if (role === "customer") return "/dashboard";
  if (role && STAFF_ROLES.includes(role)) return "/admin";
  return "/login";
}
