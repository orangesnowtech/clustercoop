"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatKobo, nairaToKobo } from "@/lib/money";

export interface InvestProduct {
  id: string;
  name: string;
  description: string;
}
export interface InvestHolding {
  productId: string;
  productName: string;
  currentValueKobo: number;
  costBasisKobo: number;
}

export function InvestPanel({
  products,
  holdings,
  cashKobo,
}: {
  products: InvestProduct[];
  holdings: InvestHolding[];
  cashKobo: number;
}) {
  const router = useRouter();
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setAmount = (key: string, v: string) =>
    setAmounts((a) => ({ ...a, [key]: v }));

  async function act(
    path: "allocate" | "redeem",
    productId: string,
    key: string,
  ) {
    setError(null);
    const naira = parseFloat(amounts[key] ?? "");
    if (!Number.isFinite(naira) || naira <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setBusy(key);
    try {
      const res = await fetch(`/api/investments/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, amountKobo: nairaToKobo(naira) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Action failed");
      setAmount(key, "");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-ink-soft">Available cash to invest</p>
        <p className="font-figures text-2xl font-semibold text-ink">
          {formatKobo(cashKobo)}
        </p>
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          Products
        </h2>
        {products.length === 0 ? (
          <p className="text-sm text-ink-soft">No products available yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {products.map((p) => {
              const key = `buy_${p.id}`;
              return (
                <li key={p.id} className="rounded-2xl border border-border bg-white p-5">
                  <div className="mb-3">
                    <div className="font-medium text-ink">{p.name}</div>
                    {p.description && (
                      <div className="text-sm text-ink-soft">{p.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Amount (₦)"
                      value={amounts[key] ?? ""}
                      onChange={(e) => setAmount(key, e.target.value)}
                      className="w-40 rounded-lg border border-border bg-surface px-3 py-2 text-right font-figures text-ink outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => act("allocate", p.id, key)}
                      disabled={busy !== null}
                      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed disabled:opacity-60"
                    >
                      {busy === key ? "…" : "Invest"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          Your holdings
        </h2>
        {holdings.length === 0 ? (
          <p className="text-sm text-ink-soft">You have no holdings yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {holdings.map((h) => {
              const key = `sell_${h.productId}`;
              const gain = h.currentValueKobo - h.costBasisKobo;
              return (
                <li key={h.productId} className="rounded-2xl border border-border bg-white p-5">
                  <div className="mb-3 flex items-baseline justify-between">
                    <div className="font-medium text-ink">{h.productName}</div>
                    <div className="text-right">
                      <div className="font-figures text-ink">
                        {formatKobo(h.currentValueKobo)}
                      </div>
                      <div
                        className={
                          "font-figures text-xs " +
                          (gain >= 0 ? "text-credit" : "text-debit")
                        }
                      >
                        {gain >= 0 ? "+" : "−"}
                        {formatKobo(Math.abs(gain))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Amount (₦)"
                      value={amounts[key] ?? ""}
                      onChange={(e) => setAmount(key, e.target.value)}
                      className="w-40 rounded-lg border border-border bg-surface px-3 py-2 text-right font-figures text-ink outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => act("redeem", h.productId, key)}
                      disabled={busy !== null}
                      className="rounded-lg border border-border px-4 py-2 text-sm text-ink-soft transition hover:bg-surface disabled:opacity-60"
                    >
                      {busy === key ? "…" : "Redeem"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-debit">{error}</p>}
    </div>
  );
}
