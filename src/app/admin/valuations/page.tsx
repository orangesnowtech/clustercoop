import { requireRole } from "@/lib/auth/session";
import { LEDGER_WRITERS } from "@/lib/auth/api";
import { listProducts } from "@/lib/products/products";
import { listValuationRuns } from "@/lib/investments/valuation";
import { formatKobo } from "@/lib/money";
import { ValuationRunner } from "@/components/invest/ValuationRunner";

interface RunRow {
  runId: string;
  basis: { type: string; productId?: string };
  rateBps: number;
  clientCount?: number;
  totalKobo?: number;
  status: string;
}

export default async function ValuationsPage() {
  await requireRole(LEDGER_WRITERS);
  const [products, runs] = await Promise.all([
    listProducts(),
    listValuationRuns(),
  ]);
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Valuations</h1>
      <p className="mb-8 text-sm text-ink-soft">
        Post a periodic gain/loss to a product&apos;s holders or to client cash.
      </p>

      <div className="mb-8">
        <ValuationRunner
          products={products
            .filter((p) => p.status === "active")
            .map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Recent runs</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {runs.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">No valuations yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Applied to</th>
                <th className="px-4 py-3 font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">Clients</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(runs as RunRow[]).map((r) => (
                <tr key={r.runId}>
                  <td className="px-4 py-3 text-ink">
                    {r.basis.type === "cash"
                      ? "Client cash"
                      : `Product · ${nameById.get(r.basis.productId ?? "") ?? r.basis.productId}`}
                  </td>
                  <td className="px-4 py-3 font-figures">
                    {(r.rateBps / 100).toFixed(2)}%
                  </td>
                  <td className="px-4 py-3 text-right font-figures">{r.clientCount ?? 0}</td>
                  <td className="px-4 py-3 text-right font-figures">
                    {formatKobo(r.totalKobo ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
