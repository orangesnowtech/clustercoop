"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ValuationRunner({
  products,
}: {
  products: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [basis, setBasis] = useState("cash");
  const [ratePct, setRatePct] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const pct = parseFloat(ratePct);
    if (!Number.isFinite(pct) || pct === 0) {
      setError("Enter a non-zero %.");
      return;
    }
    setBusy(true);
    try {
      const body = {
        basis: basis === "cash" ? { type: "cash" } : { type: "product", productId: basis },
        rateBps: Math.round(pct * 100),
      };
      const res = await fetch("/api/valuations/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Run failed");
      setMsg(`Posted to ${j.clientCount} client(s).`);
      setRatePct("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={run} className="rounded-2xl border border-border bg-white p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">
        Post a valuation
      </h2>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-ink-soft">Apply to</span>
          <select
            value={basis}
            onChange={(e) => setBasis(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary"
          >
            <option value="cash">Client cash balances</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                Product · {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-ink-soft">Return %</span>
          <input
            type="number"
            step="0.01"
            placeholder="e.g. 8 or -3"
            value={ratePct}
            onChange={(e) => setRatePct(e.target.value)}
            className="w-32 rounded-lg border border-border bg-surface px-3 py-2 text-right font-figures text-ink outline-none focus:border-primary"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed disabled:opacity-60"
        >
          {busy ? "Posting…" : "Run valuation"}
        </button>
      </div>
      {msg && <p className="mt-3 text-sm text-credit">{msg}</p>}
      {error && <p className="mt-3 text-sm text-debit">{error}</p>}
    </form>
  );
}
