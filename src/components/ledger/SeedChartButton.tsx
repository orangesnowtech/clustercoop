"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SeedChartButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function seed() {
    setPending(true);
    await fetch("/api/ledger/seed", { method: "POST" });
    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={seed}
      disabled={pending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed disabled:opacity-60"
    >
      {pending ? "Seeding…" : "Seed chart of accounts"}
    </button>
  );
}
