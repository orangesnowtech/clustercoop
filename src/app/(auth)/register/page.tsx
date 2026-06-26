"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { registerCustomer, syncSession } from "@/lib/auth/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { Field, SubmitButton, FormError } from "@/components/ui/Field";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );
      // Set the customer claim + client doc server-side...
      await registerCustomer(cred.user);
      // ...then mint the session from a refreshed token carrying the new claim.
      await syncSession(cred.user, true);
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">
        Create your account
      </h1>
      <p className="mb-6 text-sm text-ink-soft">
        Start investing with Cluster.
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
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="text-coffee hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
