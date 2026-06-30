import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getClientStatement } from "@/lib/statements/statement";
import { getClientHoldings } from "@/lib/investments/holdings";
import { listProducts } from "@/lib/products/products";
import { formatKobo, sumKobo } from "@/lib/money";
import { StatementTable } from "@/components/statement/StatementTable";

export default async function DashboardPage() {
  const user = await requireRole(["customer"]);
  const [{ rows, summary }, holdings, products] = await Promise.all([
    getClientStatement(user.uid),
    getClientHoldings(user.uid),
    listProducts(),
  ]);
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const investedKobo = sumKobo(holdings.map((h) => h.currentValueKobo));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
        Your portfolio
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Balance, activity and statements at a glance.
      </p>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-6 sm:col-span-1">
          <p className="text-sm text-ink-soft">Available balance</p>
          <p className="font-figures text-3xl font-semibold text-ink">
            {formatKobo(summary.balanceKobo)}
          </p>
          <div className="mt-4 flex gap-2">
            <Link
              href="/dashboard/deposit"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-primary-pressed"
            >
              Deposit
            </Link>
            <Link
              href="/dashboard/withdraw"
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-ink-soft transition hover:bg-surface"
            >
              Withdraw
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <p className="text-sm text-ink-soft">Total deposited</p>
          <p className="font-figures text-2xl font-semibold text-credit">
            {formatKobo(summary.totalInKobo)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <p className="text-sm text-ink-soft">Total withdrawn</p>
          <p className="font-figures text-2xl font-semibold text-debit">
            {formatKobo(summary.totalOutKobo)}
          </p>
        </div>
      </section>

      <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Recent activity
          </h2>
          <Link href="/dashboard/transactions" className="text-sm text-coffee hover:underline">
            View all
          </Link>
        </div>
        <StatementTable rows={rows} limit={5} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-ink">
            Holdings · {formatKobo(investedKobo)} invested
          </h2>
          <Link href="/dashboard/invest" className="text-sm text-coffee hover:underline">
            Invest
          </Link>
        </div>
        {holdings.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-ink-soft">
            No investments yet — put your cash to work on the Invest page.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {holdings.map((h) => {
              const gain = h.currentValueKobo - h.costBasisKobo;
              return (
                <li key={h.productId} className="flex items-center justify-between px-4 py-3">
                  <span className="text-ink">{nameById.get(h.productId) ?? h.productId}</span>
                  <span className="text-right">
                    <span className="block font-figures text-ink">
                      {formatKobo(h.currentValueKobo)}
                    </span>
                    <span
                      className={
                        "block font-figures text-xs " +
                        (gain >= 0 ? "text-credit" : "text-debit")
                      }
                    >
                      {gain >= 0 ? "+" : "−"}
                      {formatKobo(Math.abs(gain))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
