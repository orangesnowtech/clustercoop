"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductRow {
  id: string;
  name: string;
  description: string;
  status: string;
  expectedReturnBps: number | null;
}

export function ProductsManager({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [returnPct, setReturnPct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    try {
      const pct = parseFloat(returnPct);
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          expectedReturnBps: Number.isFinite(pct) ? Math.round(pct * 100) : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      setName("");
      setDescription("");
      setReturnPct("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, status: string) {
    setBusy(true);
    try {
      await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: status === "active" ? "closed" : "active" }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={create} className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">New product</h2>
        <div className="flex flex-col gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary"
          />
          <input
            placeholder="Expected return % (optional)"
            type="number"
            step="0.01"
            value={returnPct}
            onChange={(e) => setReturnPct(e.target.value)}
            className="w-56 rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary"
          />
          {error && <p className="text-sm text-debit">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="self-start rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed disabled:opacity-60"
          >
            {busy ? "…" : "Create product"}
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {products.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">No products yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-ink">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-ink-soft">{p.description}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (p.status === "active"
                          ? "bg-credit/10 text-credit"
                          : "bg-surface text-ink-soft")
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggle(p.id, p.status)}
                      disabled={busy}
                      className="text-sm text-coffee hover:underline disabled:opacity-60"
                    >
                      {p.status === "active" ? "Close" : "Reopen"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
