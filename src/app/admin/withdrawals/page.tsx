import { requireRole } from "@/lib/auth/session";
import { LEDGER_WRITERS } from "@/lib/auth/api";
import { formatKobo } from "@/lib/money";
import { listOpenWithdrawals } from "@/lib/withdrawals/queries";
import { WithdrawalActions } from "@/components/withdrawal/WithdrawalActions";

const APPROVERS = ["compliance", "admin", "superadmin"] as const;

const statusStyles: Record<string, string> = {
  requested: "bg-pending/10 text-pending",
  approved: "bg-credit/10 text-credit",
};

export default async function WithdrawalsPage() {
  const user = await requireRole([
    "superadmin",
    "admin",
    "accounts",
    "compliance",
  ]);
  const canApprove = !!user.role && (APPROVERS as readonly string[]).includes(user.role);
  const canPost = !!user.role && LEDGER_WRITERS.includes(user.role);

  const queue = await listOpenWithdrawals();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Withdrawals
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Compliance approves requests; Accounts posts approved payouts to the ledger.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {queue.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            Nothing awaiting review or posting.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Destination</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {queue.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-3 font-figures text-xs text-ink-soft">
                    {w.uid.slice(0, 10)}…
                  </td>
                  <td className="px-4 py-3 text-ink">
                    <div>{w.destination.accountName}</div>
                    <div className="text-xs text-ink-soft">
                      {w.destination.bankName} · {w.destination.accountNumber}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-figures text-ink">
                    {formatKobo(w.amountKobo)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (statusStyles[w.status] ?? "bg-surface text-ink-soft")
                      }
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <WithdrawalActions
                      id={w.id}
                      actions={{
                        approve: canApprove && w.status === "requested",
                        reject: canApprove && w.status === "requested",
                        post: canPost && w.status === "approved",
                      }}
                    />
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
