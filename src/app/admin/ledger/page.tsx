import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { LEDGER_WRITERS } from "@/lib/auth/api";
import { getTrialBalance } from "@/lib/ledger/trialBalance";
import { listEntries } from "@/lib/ledger/entries";
import { formatKobo } from "@/lib/money";
import { SeedChartButton } from "@/components/ledger/SeedChartButton";
import { VerifyButton } from "@/components/ledger/VerifyButton";

export default async function LedgerPage() {
  await requireRole(LEDGER_WRITERS);
  const tb = await getTrialBalance();
  const entries = await listEntries(15);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink">Ledger</h1>
        <Link
          href="/admin/ledger/new"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed"
        >
          New entry
        </Link>
      </div>

      {tb.rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <p className="mb-4 text-ink-soft">
            The chart of accounts hasn&apos;t been seeded yet.
          </p>
          <SeedChartButton />
        </div>
      ) : (
        <>
          <section className="mb-8 rounded-2xl border border-border bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">
                Trial balance
              </h2>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-medium " +
                  (tb.balanced
                    ? "bg-credit/10 text-credit"
                    : "bg-debit/10 text-debit")
                }
              >
                {tb.balanced ? "Balanced" : "OUT OF BALANCE"}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-ink-soft">
                  <th className="py-2 font-medium">Code</th>
                  <th className="py-2 font-medium">Account</th>
                  <th className="py-2 text-right font-medium">Debit</th>
                  <th className="py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody className="font-figures">
                {tb.rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60">
                    <td className="py-1.5 text-ink-soft">{r.code}</td>
                    <td className="py-1.5 font-sans text-ink">{r.name}</td>
                    <td className="py-1.5 text-right text-ink">
                      {r.debitKobo ? formatKobo(r.debitKobo) : "—"}
                    </td>
                    <td className="py-1.5 text-right text-ink">
                      {r.creditKobo ? formatKobo(r.creditKobo) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-figures font-semibold">
                  <td />
                  <td className="py-2 font-sans text-ink">Total</td>
                  <td className="py-2 text-right text-ink">
                    {formatKobo(tb.totalDebitKobo)}
                  </td>
                  <td className="py-2 text-right text-ink">
                    {formatKobo(tb.totalCreditKobo)}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-4">
              <VerifyButton />
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Recent entries
            </h2>
            {entries.length === 0 ? (
              <p className="text-sm text-ink-soft">No entries yet.</p>
            ) : (
              <ul className="divide-y divide-border/60 text-sm">
                {entries.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/admin/ledger/${e.id}`}
                      className="flex items-center justify-between py-2 hover:text-coffee"
                    >
                      <span>
                        <span className="text-ink-soft">{e.postedDate}</span>{" "}
                        <span className="text-ink">{e.memo || e.type}</span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="font-figures text-ink-soft">
                          {formatKobo(e.totalDebitKobo)}
                        </span>
                        {e.status !== "posted" && (
                          <span className="rounded-full bg-pending/10 px-2 py-0.5 text-xs text-pending">
                            {e.status}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
