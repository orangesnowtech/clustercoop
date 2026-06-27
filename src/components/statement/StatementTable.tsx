import { formatKobo } from "@/lib/money";
import type { StatementRow } from "@/lib/statements/rows";

export function StatementTable({
  rows,
  limit,
}: {
  rows: StatementRow[];
  limit?: number;
}) {
  const shown = limit ? rows.slice(-limit).reverse() : [...rows].reverse();

  if (shown.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-ink-soft">No transactions yet.</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead className="border-b border-border bg-surface text-left text-xs uppercase text-ink-soft">
        <tr>
          <th className="px-4 py-3 font-medium">Date</th>
          <th className="px-4 py-3 font-medium">Description</th>
          <th className="px-4 py-3 text-right font-medium">In</th>
          <th className="px-4 py-3 text-right font-medium">Out</th>
          <th className="px-4 py-3 text-right font-medium">Balance</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border/60">
        {shown.map((r, i) => (
          <tr key={`${r.entryId}_${i}`}>
            <td className="px-4 py-3 font-figures text-xs text-ink-soft">{r.date}</td>
            <td className="px-4 py-3 text-ink">{r.description}</td>
            <td className="px-4 py-3 text-right font-figures text-credit">
              {r.inflowKobo > 0 ? formatKobo(r.inflowKobo) : ""}
            </td>
            <td className="px-4 py-3 text-right font-figures text-debit">
              {r.outflowKobo > 0 ? formatKobo(r.outflowKobo) : ""}
            </td>
            <td className="px-4 py-3 text-right font-figures text-ink">
              {formatKobo(r.runningBalanceKobo)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
