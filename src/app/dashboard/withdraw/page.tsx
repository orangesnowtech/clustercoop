import { requireRole } from "@/lib/auth/session";
import { getClientLedger } from "@/lib/ledger/statements";
import { formatKobo } from "@/lib/money";
import { computeAvailableKobo } from "@/lib/withdrawals/available";
import { getClientWithdrawals, getLiveWithdrawals } from "@/lib/withdrawals/queries";
import { WithdrawForm } from "@/components/withdrawal/WithdrawForm";
import { WithdrawalActions } from "@/components/withdrawal/WithdrawalActions";

const statusStyles: Record<string, string> = {
  posted: "bg-credit/10 text-credit",
  approved: "bg-pending/10 text-pending",
  requested: "bg-pending/10 text-pending",
  rejected: "bg-debit/10 text-debit",
  cancelled: "bg-surface text-ink-soft",
};

export default async function WithdrawPage() {
  const user = await requireRole(["customer"]);
  const [{ balanceKobo }, live, withdrawals] = await Promise.all([
    getClientLedger(user.uid),
    getLiveWithdrawals(user.uid),
    getClientWithdrawals(user.uid),
  ]);
  const availableKobo = computeAvailableKobo(balanceKobo, live);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Withdraw
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Requests are reviewed by Compliance, then paid out by Accounts.
      </p>

      <section className="mb-8 grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-white p-6">
          <p className="text-sm text-ink-soft">Balance</p>
          <p className="font-figures text-2xl font-semibold text-ink">
            {formatKobo(balanceKobo)}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-6">
          <p className="text-sm text-ink-soft">Available to withdraw</p>
          <p className="font-figures text-2xl font-semibold text-ink">
            {formatKobo(availableKobo)}
          </p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          New request
        </h2>
        <WithdrawForm />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          Your requests
        </h2>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-ink-soft">No withdrawals yet.</p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <span className="font-figures text-ink">{formatKobo(w.amountKobo)}</span>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs font-medium " +
                      (statusStyles[w.status] ?? "bg-surface text-ink-soft")
                    }
                  >
                    {w.status}
                  </span>
                  {w.status === "requested" && (
                    <WithdrawalActions id={w.id} actions={{ cancel: true }} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
