/**
 * Server-side session — the AUTHORITATIVE auth boundary (SERVER-ONLY).
 *
 * Middleware does optimistic routing; this is where the session cookie is
 * actually verified (signature + revocation) before any protected page renders
 * or any sensitive action runs. Use these helpers in Server Components, Route
 * Handlers and Server Actions.
 */
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "./constants";
import { isRole, type Role } from "@/lib/roles";

export interface SessionUser {
  uid: string;
  email: string | null;
  role: Role | undefined;
}

/** Mint a Firebase session cookie from a freshly-issued ID token. */
export async function createSessionCookie(idToken: string): Promise<string> {
  return getAdminAuth().createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

/** Verify the current request's session cookie. Returns null if missing/invalid. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookie = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    // checkRevoked: true → rejects sessions revoked since sign-in (network call).
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    const role = isRole(decoded.role) ? decoded.role : undefined;
    return { uid: decoded.uid, email: decoded.email ?? null, role };
  } catch {
    return null;
  }
}

/** Require any authenticated user; redirect to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of `allowed` roles; redirect to /login otherwise. */
export async function requireRole(allowed: readonly Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.role || !allowed.includes(user.role)) redirect("/login");
  return user;
}
