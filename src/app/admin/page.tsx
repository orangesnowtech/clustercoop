import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/roles";
import { getAdminOverview } from "@/lib/admin/overview";
import { formatKobo } from "@/lib/money";

const TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  allocation: "Investment",
  redemption: "Redemption",
  valuation: "Returns",
  fee: "Fee",
  reversal: "Reversal",
  manual: "Adjustment",
  opening: "Opening",
};

function Metric({
  label,
  value,
  href,
  badge,
}: {
  label: string;
  value: string;
  href?: string;
  badge?: "ok" | "warn";
}) {
  const body = (
    <div className="rounded-2xl border border-border bg-white p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p
        className={
          "font-figures text-2xl font-semibold " +
          (badge === "warn" ? "text-pending" : badge === "ok" ? "text-credit" : "text-ink")
        }
      >
        {value}
      </p>
    </div>
  );
  return href ? (
    <Link href={href} className="transition hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}

export default async function AdminPage() {
  const user = await requireRole(STAFF_ROLES);

  // RMs are scoped to assigned clients — no portal-wide financials.
  if (user.role === "rm") {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="mb-2 font-display text-2xl font-semibold text-ink">Back office</h1>
        <p className="mb-8 text-sm text-ink-soft">Your assigned clients.</p>
        <Link
          href="/admin/investors"
          className="inline-block rounded-2xl border border-border bg-white p-6 text-ink transition hover:opacity-80"
        >
          View my investors →
        </Link>
      </main>
    );
  }

  const o = await getAdminOverview();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">Back office</h1>
      <p className="mb-8 text-sm text-ink-soft">Portal overview.</p>

      <section className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Client funds (AUM)" value={formatKobo(o.aumKobo)} />
        <Metric label="Cash held" value={formatKobo(o.clientCashKobo)} />
        <Metric label="Invested" value={formatKobo(o.clientHoldingsKobo)} />
        <Metric label="Cash at bank" value={formatKobo(o.bankKobo)} />
      </section>

      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Metric label="Clients" value={String(o.clientCount)} href="/admin/investors" />
        <Metric
          label="Pending KYC"
          value={String(o.pendingKyc)}
          href="/admin/kyc"
          badge={o.pendingKyc > 0 ? "warn" : undefined}
        />
        <Metric
          label="Pending withdrawals"
          value={String(o.pendingWithdrawals)}
          href="/admin/withdrawals"
          badge={o.pendingWithdrawals > 0 ? "warn" : undefined}
        />
        <Metric label="Active products" value={String(o.activeProducts)} href="/admin/products" />
      </section>

      <section className="mb-8">
        <Link href="/admin/ledger">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-white p-5 transition hover:opacity-80">
            <span className="text-sm text-ink-soft">Books</span>
            <span
              className={
                "rounded-full px-3 py-1 text-sm font-medium " +
                (o.trialBalanced ? "bg-credit/10 text-credit" : "bg-debit/10 text-debit")
              }
            >
              {o.trialBalanced ? "Trial balance balanced" : "Out of balance — review"}
            </span>
          </div>
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <h2 className="px-4 py-3 font-display text-lg font-semibold text-ink">
          Recent activity
        </h2>
        {o.recent.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-ink-soft">No entries yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-y border-border bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">By</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {o.recent.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-2 font-figures text-xs text-ink-soft">{e.postedDate}</td>
                  <td className="px-4 py-2 text-ink">{TYPE_LABEL[e.type] ?? e.type}</td>
                  <td className="px-4 py-2 text-xs text-ink-soft">{e.createdByRole}</td>
                  <td className="px-4 py-2 text-right font-figures text-ink">
                    {formatKobo(e.totalKobo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
