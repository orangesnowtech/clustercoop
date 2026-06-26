/**
 * API auth helper — like requireRole but for Route Handlers: returns a JSON
 * 401/403 Response instead of redirecting (redirects are for pages).
 */
import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser, type SessionUser } from "./session";
import type { Role } from "@/lib/roles";

export async function apiRequireRole(
  allowed: readonly Role[],
): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  if (!user.role || !allowed.includes(user.role)) {
    return { user: null, error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}

/** Roles permitted to post to / reverse the ledger. */
export const LEDGER_WRITERS: Role[] = ["superadmin", "admin", "accounts"];
