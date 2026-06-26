/**
 * Session route — mint / clear the httpOnly session cookie.
 *
 * POST  { idToken } → verify the ID token, create a Firebase session cookie,
 *                     set it httpOnly. Returns the user's role for client routing.
 * DELETE            → clear the session cookie (sign-out).
 */
import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { createSessionCookie } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_MS } from "@/lib/auth/constants";

const isProd = process.env.NODE_ENV === "production";

export async function POST(req: Request) {
  let idToken: unknown;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    const sessionCookie = await createSessionCookie(idToken);

    const res = NextResponse.json({ role: decoded.role ?? null });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
