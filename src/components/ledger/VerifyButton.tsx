"use client";

import { useState } from "react";

interface VerifyResult {
  lineSumsBalanced: boolean;
  cacheConsistent: boolean;
  drift: Array<{ accountId: string; cachedKobo: number; recomputedKobo: number }>;
}

export function VerifyButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  async function verify() {
    setPending(true);
    const res = await fetch("/api/ledger/verify");
    setResult(await res.json());
    setPending(false);
  }

  const ok = result?.lineSumsBalanced && result?.cacheConsistent;

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={verify}
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-soft transition hover:bg-surface disabled:opacity-60"
      >
        {pending ? "Verifying…" : "Recompute & verify"}
      </button>
      {result && (
        <span
          className={
            "text-sm font-medium " + (ok ? "text-credit" : "text-debit")
          }
        >
          {ok
            ? "Ledger consistent — derived balances match"
            : `Drift detected (${result.drift.length} account(s))`}
        </span>
      )}
    </div>
  );
}
