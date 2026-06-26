/**
 * Trial balance (SERVER-ONLY) — reads cached account balances and splits them
 * into debit/credit columns. The books balance iff total debits == total
 * credits. Fast path (cache); use verify.ts to re-derive from lines.
 */
import "server-only";
import { trialBalanceColumns } from "./balance";
import { listAccounts } from "./accounts";
import type { Kobo } from "@/lib/money";

export interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  debitKobo: Kobo;
  creditKobo: Kobo;
}

export interface TrialBalance {
  rows: TrialBalanceRow[];
  totalDebitKobo: Kobo;
  totalCreditKobo: Kobo;
  balanced: boolean;
}

export async function getTrialBalance(): Promise<TrialBalance> {
  const accounts = await listAccounts();
  const rows: TrialBalanceRow[] = [];
  let totalDebitKobo = 0;
  let totalCreditKobo = 0;

  for (const acct of accounts) {
    // Control accounts are roll-ups of their subs; skip to avoid double-count.
    if (acct.isControl) continue;
    const { debitKobo, creditKobo } = trialBalanceColumns(
      acct.normalBalance,
      acct.cachedBalanceKobo,
    );
    totalDebitKobo += debitKobo;
    totalCreditKobo += creditKobo;
    rows.push({ id: acct.id, code: acct.code, name: acct.name, debitKobo, creditKobo });
  }

  return {
    rows,
    totalDebitKobo,
    totalCreditKobo,
    balanced: totalDebitKobo === totalCreditKobo,
  };
}
