"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { Field, SubmitButton, FormError } from "@/components/ui/Field";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">
        Reset password
      </h1>
      {sent ? (
        <p className="mt-4 rounded-lg bg-credit/10 px-3 py-2 text-sm text-credit">
          If an account exists for {email}, a reset link is on its way.
        </p>
      ) : (
        <>
          <p className="mb-6 text-sm text-ink-soft">
            Enter your email and we&apos;ll send a reset link.
          </p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FormError message={error} />
            <SubmitButton pending={pending}>Send reset link</SubmitButton>
          </form>
        </>
      )}
      <p className="mt-6 text-sm text-ink-soft">
        <Link href="/login" className="text-coffee hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}
