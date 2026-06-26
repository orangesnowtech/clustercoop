"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase/client";
import { syncSession } from "@/lib/auth/client";
import { friendlyAuthError } from "@/lib/auth/errors";
import { homeForRole } from "@/lib/auth/routes";
import { isRole } from "@/lib/roles";
import { Field, SubmitButton, FormError } from "@/components/ui/Field";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email,
        password,
      );
      const { role } = await syncSession(cred.user);
      const next = params.get("next");
      const dest = next ?? homeForRole(isRole(role) ? role : undefined);
      router.replace(dest);
      router.refresh();
    } catch (err) {
      setError(friendlyAuthError(err));
      setPending(false);
    }
  }

  return (
    <>
      <h1 className="mb-1 font-display text-xl font-semibold text-ink">
        Sign in
      </h1>
      <p className="mb-6 text-sm text-ink-soft">Welcome back to Cluster.</p>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <FormError message={error} />
        <SubmitButton pending={pending}>Sign in</SubmitButton>
      </form>
      <div className="mt-6 flex justify-between text-sm">
        <Link href="/forgot-password" className="text-coffee hover:underline">
          Forgot password?
        </Link>
        <Link href="/register" className="text-coffee hover:underline">
          Create account
        </Link>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
