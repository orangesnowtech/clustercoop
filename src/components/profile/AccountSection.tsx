"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function AccountSection({
  email,
  memberSince,
}: {
  email: string | null;
  memberSince: string | null;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resetPassword() {
    if (!email) return;
    setPending(true);
    setStatus(null);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setStatus("Password reset link sent to your email.");
    } catch {
      setStatus("Could not send reset link. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">Account</h2>
      <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm">
        <dt className="text-ink-soft">Email</dt>
        <dd className="text-ink">{email ?? "—"}</dd>
        {memberSince && (
          <>
            <dt className="text-ink-soft">Member since</dt>
            <dd className="text-ink">{memberSince}</dd>
          </>
        )}
      </dl>
      <button
        onClick={resetPassword}
        disabled={pending || !email}
        className="mt-5 rounded-lg border border-border px-4 py-2 text-sm text-ink-soft transition hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Sending…" : "Change password"}
      </button>
      {status && <p className="mt-2 text-sm text-ink-soft">{status}</p>}
    </section>
  );
}
