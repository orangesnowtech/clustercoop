"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthProvider";

export function SignOutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  async function onClick() {
    await logout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-soft transition hover:bg-surface"
    >
      Sign out
    </button>
  );
}
