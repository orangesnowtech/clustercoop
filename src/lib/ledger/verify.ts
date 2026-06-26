/**
 * Verify / recompute (SERVER-ONLY) — treats journalLines as the source of
 * truth and re-derives balances, reporting any drift from the cached values.
 * This is what makes the cache "derived, never the source of truth".
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { signedDelta } from "./balance";
import { COLLECTIONS, listAccounts } from "./accounts";
import type { JournalLine } from "./types";
import type { Kobo } from "@/lib/money";

/** Recompute one account's balance from its lines (no cache read). */
export async function recomputeAccountBalance(accountId: string): Promise<Kobo> {
  const db = getAdminDb();
  const snap = await db
    .collection(COLLECTIONS.journalLines)
    .where("accountId", "==", accountId)
    .get();
  let balance = 0;
  for (const doc of snap.docs) {
    const line = doc.data() as JournalLine;
    balance += signedDelta(line.normalBalance, line.debitKobo, line.creditKobo);
  }
  return balance;
}

export interface LedgerVerification {
  drift: Array<{ accountId: string; cachedKobo: Kobo; recomputedKobo: Kobo }>;
  totalDebitKobo: Kobo;
  totalCreditKobo: Kobo;
  lineSumsBalanced: boolean; // Σ debits === Σ credits across all lines
  cacheConsistent: boolean; // no per-account drift
}

/**
 * Whole-ledger verification: per-account drift between cache and recomputed
 * value, plus the global invariant that all debits equal all credits.
 */
export async function verifyLedger(): Promise<LedgerVerification> {
  const db = getAdminDb();
  const [accounts, linesSnap] = await Promise.all([
    listAccounts(),
    db.collection(COLLECTIONS.journalLines).get(),
  ]);

  const recomputed = new Map<string, number>();
  let totalDebitKobo = 0;
  let totalCreditKobo = 0;
  for (const doc of linesSnap.docs) {
    const line = doc.data() as JournalLine;
    totalDebitKobo += line.debitKobo;
    totalCreditKobo += line.creditKobo;
    recomputed.set(
      line.accountId,
      (recomputed.get(line.accountId) ?? 0) +
        signedDelta(line.normalBalance, line.debitKobo, line.creditKobo),
    );
  }

  const drift: LedgerVerification["drift"] = [];
  for (const acct of accounts) {
    const recomputedKobo = recomputed.get(acct.id) ?? 0;
    if (recomputedKobo !== acct.cachedBalanceKobo) {
      drift.push({
        accountId: acct.id,
        cachedKobo: acct.cachedBalanceKobo,
        recomputedKobo,
      });
    }
  }

  return {
    drift,
    totalDebitKobo,
    totalCreditKobo,
    lineSumsBalanced: totalDebitKobo === totalCreditKobo,
    cacheConsistent: drift.length === 0,
  };
}

/** Repair: write recomputed balances back to every account's cache. */
export async function rebuildAllCaches(): Promise<number> {
  const db = getAdminDb();
  const accounts = await listAccounts();
  await Promise.all(
    accounts.map(async (acct) => {
      const recomputedKobo = await recomputeAccountBalance(acct.id);
      await db.collection(COLLECTIONS.accounts).doc(acct.id).update({
        cachedBalanceKobo: recomputedKobo,
        cachedAsOf: FieldValue.serverTimestamp(),
      });
    }),
  );
  return accounts.length;
}
