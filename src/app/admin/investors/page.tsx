import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { listClientsForStaff } from "@/lib/clients/access";
import { getClientLedger } from "@/lib/ledger/statements";
import { formatKobo } from "@/lib/money";

const kycStyles: Record<string, string> = {
  approved: "bg-credit/10 text-credit",
  pending: "bg-pending/10 text-pending",
  rejected: "bg-debit/10 text-debit",
};

export default async function InvestorsPage() {
  const user = await requireRole([
    "superadmin",
    "admin",
    "accounts",
    "compliance",
    "rm",
  ]);
  const clients = await listClientsForStaff(user);
  const withBalances = await Promise.all(
    clients.map(async (c) => ({
      ...c,
      balanceKobo: (await getClientLedger(c.uid)).balanceKobo,
    })),
  );

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Investors
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        {user.role === "rm"
          ? "Your assigned clients."
          : "All client accounts."}
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {withBalances.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            No clients to show.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">KYC</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {withBalances.map((c) => (
                <tr key={c.uid}>
                  <td className="px-4 py-3 text-ink">{c.email ?? c.uid}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (kycStyles[c.kycStatus ?? ""] ?? "bg-surface text-ink-soft")
                      }
                    >
                      {c.kycStatus ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-figures text-ink">
                    {formatKobo(c.balanceKobo)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/investors/${c.uid}`}
                      className="text-sm text-coffee hover:underline"
                    >
                      View
                    </Link>
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
