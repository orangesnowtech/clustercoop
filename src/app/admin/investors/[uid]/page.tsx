import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/roles";
import { canViewClient, getClient } from "@/lib/clients/access";
import { getClientStatement } from "@/lib/statements/statement";
import { getClientLedger } from "@/lib/ledger/statements";
import { getClientHoldings } from "@/lib/investments/holdings";
import { listProducts } from "@/lib/products/products";
import { formatKobo, sumKobo } from "@/lib/money";
import { StatementTable } from "@/components/statement/StatementTable";
import { DownloadStatementButton } from "@/components/statement/DownloadStatementButton";

const kycStyles: Record<string, string> = {
  approved: "bg-credit/10 text-credit",
  in_review: "bg-pending/10 text-pending",
  pending: "bg-pending/10 text-pending",
  rejected: "bg-debit/10 text-debit",
};

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const user = await requireRole(STAFF_ROLES);
  // RM scoping: only assigned clients are viewable.
  if (!(await canViewClient(user, uid))) notFound();

  const [client, { rows }, { balanceKobo }, holdings, products] = await Promise.all([
    getClient(uid),
    getClientStatement(uid),
    getClientLedger(uid),
    getClientHoldings(uid),
    listProducts(),
  ]);
  const nameById = new Map(products.map((p) => [p.id, p.name]));
  const investedKobo = sumKobo(holdings.map((h) => h.currentValueKobo));
  const kyc = client?.kycStatus ?? "pending";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href="/admin/investors" className="text-sm text-coffee hover:underline">
        ← Investors
      </Link>
      <div className="mt-2 mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {client?.email ?? uid}
          </h1>
          <span
            className={
              "mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium " +
              (kycStyles[kyc] ?? "bg-surface text-ink-soft")
            }
          >
            KYC: {kyc}
          </span>
        </div>
        <DownloadStatementButton uid={uid} />
      </div>

      {/* Balances — the client's portfolio as they see it. */}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-ink-soft">Cash</p>
          <p className="font-figures text-xl font-semibold text-ink">{formatKobo(balanceKobo)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-ink-soft">Invested</p>
          <p className="font-figures text-xl font-semibold text-ink">{formatKobo(investedKobo)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm text-ink-soft">Total</p>
          <p className="font-figures text-xl font-semibold text-ink">
            {formatKobo(balanceKobo + investedKobo)}
          </p>
        </div>
      </section>

      {holdings.length > 0 && (
        <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-white">
          <h2 className="px-4 py-3 font-display text-lg font-semibold text-ink">Holdings</h2>
          <ul className="divide-y divide-border/60 text-sm">
            {holdings.map((h) => {
              const gain = h.currentValueKobo - h.costBasisKobo;
              return (
                <li key={h.productId} className="flex items-center justify-between px-4 py-3">
                  <span className="text-ink">{nameById.get(h.productId) ?? h.productId}</span>
                  <span className="text-right">
                    <span className="block font-figures text-ink">{formatKobo(h.currentValueKobo)}</span>
                    <span className={"block font-figures text-xs " + (gain >= 0 ? "text-credit" : "text-debit")}>
                      {gain >= 0 ? "+" : "−"}
                      {formatKobo(Math.abs(gain))}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold text-ink">Statement</h2>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <StatementTable rows={rows} />
      </div>
    </main>
  );
}
