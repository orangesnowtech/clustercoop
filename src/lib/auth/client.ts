/**
 * Client auth helpers — talk to the auth API routes from the browser.
 *
 * These keep the server session cookie in sync with the Firebase client SDK
 * sign-in state. After any sign-in we POST the fresh ID token so the server can
 * mint the httpOnly session cookie; on sign-out we clear it.
 */
"use client";

import type { User } from "firebase/auth";

/**
 * Exchange a Firebase ID token for an httpOnly session cookie.
 * `forceRefresh` re-fetches the token so newly-set custom claims (e.g. role)
 * are included. Returns the user's role as seen by the server.
 */
export async function syncSession(
  user: User,
  forceRefresh = false,
): Promise<{ role: string | null }> {
  const idToken = await user.getIdToken(forceRefresh);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

/** Register the customer claim + client doc for a brand-new user. */
export async function registerCustomer(user: User): Promise<void> {
  const idToken = await user.getIdToken();
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Failed to complete registration");
}

/** Clear the server session cookie. */
export async function clearSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" });
}
