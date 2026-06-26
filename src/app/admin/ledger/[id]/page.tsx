import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { LEDGER_WRITERS } from "@/lib/auth/api";
import { getEntry, getEntryLines } from "@/lib/ledger/entries";
import { formatKobo } from "@/lib/money";
import { ReverseButton } from "@/components/ledger/ReverseButton";

export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(LEDGER_WRITERS);
  const { id } = await params;
  const entry = await getEntry(id);
  if (!entry) notFound();
  const lines = await getEntryLines(id);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link href="/admin/ledger" className="text-sm text-coffee hover:underline">
        ← Ledger
      </Link>

      <div className="mb-6 mt-3 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {entry.memo || entry.type}
          </h1>
          <p className="text-sm text-ink-soft">
            {entry.postedDate} · {entry.type} · by {entry.createdBy}
          </p>
        </div>
        <span
          className={
            "rounded-full px-3 py-1 text-xs font-medium " +
            (entry.status === "posted"
              ? "bg-credit/10 text-credit"
              : "bg-pending/10 text-pending")
          }
        >
          {entry.status}
        </span>
      </div>

      <table className="mb-6 w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-ink-soft">
            <th className="py-2 font-medium">Account</th>
            <th className="py-2 text-right font-medium">Debit</th>
            <th className="py-2 text-right font-medium">Credit</th>
          </tr>
        </thead>
        <tbody className="font-figures">
          {lines.map((l) => (
            <tr key={l.id} className="border-b border-border/60">
              <td className="py-1.5 font-sans text-ink">{l.accountId}</td>
              <td className="py-1.5 text-right text-ink">
                {l.debitKobo ? formatKobo(l.debitKobo) : "—"}
              </td>
              <td className="py-1.5 text-right text-ink">
                {l.creditKobo ? formatKobo(l.creditKobo) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-figures font-semibold">
            <td className="py-2 font-sans text-ink">Total</td>
            <td className="py-2 text-right text-ink">
              {formatKobo(entry.totalDebitKobo)}
            </td>
            <td className="py-2 text-right text-ink">
              {formatKobo(entry.totalCreditKobo)}
            </td>
          </tr>
        </tfoot>
      </table>

      {entry.reversalOf && (
        <p className="mb-4 text-sm text-ink-soft">
          Reversal of{" "}
          <Link
            href={`/admin/ledger/${entry.reversalOf}`}
            className="text-coffee hover:underline"
          >
            {entry.reversalOf}
          </Link>
        </p>
      )}

      {entry.status === "reversed" && entry.reversedBy && (
        <p className="mb-4 text-sm text-ink-soft">
          Reversed by{" "}
          <Link
            href={`/admin/ledger/${entry.reversedBy}`}
            className="text-coffee hover:underline"
          >
            {entry.reversedBy}
          </Link>
        </p>
      )}

      {entry.status === "posted" ? (
        <div className="rounded-2xl border border-border bg-white p-5">
          <h2 className="mb-3 font-display text-sm font-semibold text-ink">
            Reverse entry
          </h2>
          <ReverseButton entryId={entry.id} />
        </div>
      ) : (
        <p className="text-sm text-ink-soft">
          This entry is {entry.status} and cannot be reversed.
        </p>
      )}
    </main>
  );
}
