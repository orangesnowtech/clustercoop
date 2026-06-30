/**
 * Statement rows — PURE, no Firestore. Turns a client's raw journal lines
 * (their 2000:<uid> sub-account) into human-readable statement rows with
 * inflow/outflow and a running balance. For a credit-normal client account:
 * credit = money in, debit = money out.
 */
import type { JournalLine, EntryType } from "@/lib/ledger/types";
import { signedDelta } from "@/lib/ledger/balance";
import { sumKobo, type Kobo } from "@/lib/money";

export interface StatementRow {
  entryId: string;
  date: string;
  type: EntryType | "unknown";
  description: string;
  inflowKobo: Kobo;
  outflowKobo: Kobo;
  runningBalanceKobo: Kobo;
}

export interface StatementSummary {
  balanceKobo: Kobo;
  totalInKobo: Kobo;
  totalOutKobo: Kobo;
  count: number;
}

const TYPE_LABEL: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  allocation: "Investment",
  redemption: "Redemption",
  valuation: "Returns",
  fee: "Fee",
  reversal: "Reversal",
  manual: "Adjustment",
  opening: "Opening balance",
};

/** Lines must already be in date order (as getClientLedger returns them). */
export function buildStatementRows(
  lines: JournalLine[],
  entryTypeById: Map<string, EntryType>,
): StatementRow[] {
  let running = 0;
  return lines.map((line) => {
    running += signedDelta(line.normalBalance, line.debitKobo, line.creditKobo);
    const type = entryTypeById.get(line.entryId) ?? "unknown";
    return {
      entryId: line.entryId,
      date: line.date,
      type,
      description: line.memo || TYPE_LABEL[type] || "Transaction",
      inflowKobo: line.creditKobo,
      outflowKobo: line.debitKobo,
      runningBalanceKobo: running,
    };
  });
}

export function summarize(rows: StatementRow[]): StatementSummary {
  return {
    balanceKobo: rows.length ? rows[rows.length - 1].runningBalanceKobo : 0,
    totalInKobo: sumKobo(rows.map((r) => r.inflowKobo)),
    totalOutKobo: sumKobo(rows.map((r) => r.outflowKobo)),
    count: rows.length,
  };
}
