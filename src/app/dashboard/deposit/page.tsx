import { requireRole } from "@/lib/auth/session";
import { getClientLedger } from "@/lib/ledger/statements";
import { getClientDeposits } from "@/lib/deposits/pending";
import { getClientKyc } from "@/lib/kyc/queries";
import { formatKobo } from "@/lib/money";
import { KycGate } from "@/components/kyc/KycGate";
import { DepositForm } from "@/components/deposit/DepositForm";

const statusStyles: Record<string, string> = {
  success: "bg-credit/10 text-credit",
  pending: "bg-pending/10 text-pending",
  failed: "bg-debit/10 text-debit",
};

export default async function DepositPage() {
  const user = await requireRole(["customer"]);
  const [{ balanceKobo }, deposits, kyc] = await Promise.all([
    getClientLedger(user.uid),
    getClientDeposits(user.uid),
    getClientKyc(user.uid),
  ]);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Deposit
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Fund your account securely via Paystack.
      </p>

      <KycGate status={kyc.kycStatus} />

      <section className="mb-8 rounded-2xl border border-border bg-white p-6">
        <p className="text-sm text-ink-soft">Current balance</p>
        <p className="font-figures text-3xl font-semibold text-ink">
          {formatKobo(balanceKobo)}
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          New deposit
        </h2>
        <DepositForm />
      </section>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">
          Recent deposits
        </h2>
        {deposits.length === 0 ? (
          <p className="text-sm text-ink-soft">No deposits yet.</p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {deposits.map((d) => (
              <li
                key={d.reference}
                className="flex items-center justify-between py-2"
              >
                <span className="font-figures text-ink">
                  {formatKobo(
                    d.creditedKobo ?? d.grossKobo ?? d.intendedKobo,
                  )}
                </span>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-xs font-medium " +
                    (statusStyles[d.status] ?? "bg-surface text-ink-soft")
                  }
                >
                  {d.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
