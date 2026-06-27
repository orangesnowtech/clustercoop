/**
 * Posting engine (SERVER-ONLY) — the atomic, balanced, immutable write path.
 *
 * Every financial movement goes through here. The whole entry (header + lines +
 * account balance increments + idempotency ref) commits in ONE Firestore
 * transaction or not at all. Strict two-phase: all reads precede all writes.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { signedDelta } from "./balance";
import { deterministicEntryId, refDocId } from "./idempotency";
import { validateEntryLines } from "./validate";
import { COLLECTIONS } from "./accounts";
import { LedgerError, type Account, type PostEntryInput, type PostResult } from "./types";

export async function postEntry(input: PostEntryInput): Promise<PostResult> {
  // ---- Pure pre-validation (no Firestore) ----
  const { lines, totalDebitKobo, totalCreditKobo } = validateEntryLines(input.lines);
  if (!input.postedDate) {
    throw new LedgerError("missing_date", "postedDate is required.");
  }

  const db = getAdminDb();
  const accountsCol = db.collection(COLLECTIONS.accounts);
  const entriesCol = db.collection(COLLECTIONS.journalEntries);
  const linesCol = db.collection(COLLECTIONS.journalLines);
  const refsCol = db.collection(COLLECTIONS.ledgerRefs);

  const distinctAccountIds = [...new Set(lines.map((l) => l.accountId))];

  return db.runTransaction(async (tx) => {
    // ================= READ PHASE =================
    if (input.idempotencyKey) {
      const refSnap = await tx.get(refsCol.doc(refDocId(input.idempotencyKey)));
      if (refSnap.exists) {
        return { entryId: refSnap.data()!.entryId as string, idempotentReplay: true };
      }
    }

    const accountSnaps = await Promise.all(
      distinctAccountIds.map((id) => tx.get(accountsCol.doc(id))),
    );
    const accountById = new Map<string, Account>();
    accountSnaps.forEach((snap, i) => {
      const id = distinctAccountIds[i];
      if (!snap.exists) {
        throw new LedgerError("unknown_account", `Account ${id} does not exist.`);
      }
      const acct = snap.data() as Account;
      if (!acct.active) {
        throw new LedgerError("inactive_account", `Account ${id} is inactive.`);
      }
      if (acct.isControl) {
        throw new LedgerError(
          "control_account",
          `Account ${id} is a control account and cannot be posted to directly.`,
        );
      }
      accountById.set(id, acct);
    });

    // Sufficiency preconditions (e.g. withdrawals): assert atomically in the
    // read phase against the freshly-read balance. Because the same accounts are
    // also written below, concurrent posts serialize and the loser re-checks.
    for (const pre of input.preconditions ?? []) {
      const acct = accountById.get(pre.accountId);
      if (!acct) {
        throw new LedgerError(
          "precondition_account",
          `Precondition account ${pre.accountId} is not part of this entry.`,
        );
      }
      if (acct.cachedBalanceKobo < pre.minBalanceKobo) {
        throw new LedgerError(
          "insufficient_funds",
          `Insufficient funds: account ${pre.accountId} balance ${acct.cachedBalanceKobo} is below the required ${pre.minBalanceKobo}.`,
        );
      }
    }

    // Aggregate signed balance deltas per account.
    const deltaByAccount = new Map<string, number>();
    for (const line of lines) {
      const acct = accountById.get(line.accountId)!;
      const delta = signedDelta(acct.normalBalance, line.debitKobo, line.creditKobo);
      deltaByAccount.set(
        line.accountId,
        (deltaByAccount.get(line.accountId) ?? 0) + delta,
      );
    }

    // ================= WRITE PHASE =================
    const entryId = input.idempotencyKey
      ? deterministicEntryId(input.idempotencyKey)
      : entriesCol.doc().id;
    const entryRef = entriesCol.doc(entryId);

    // tx.create fails if the id already exists → closes the idempotency race.
    tx.create(entryRef, {
      status: "posted",
      type: input.type,
      reference: input.reference,
      memo: input.memo ?? "",
      reversalOf: null,
      reversedBy: null,
      totalDebitKobo,
      totalCreditKobo,
      lineCount: lines.length,
      postedDate: input.postedDate,
      createdBy: input.createdBy,
      createdByRole: input.createdByRole,
      createdAt: FieldValue.serverTimestamp(),
    });

    lines.forEach((line, i) => {
      const acct = accountById.get(line.accountId)!;
      tx.set(linesCol.doc(`${entryId}_${i}`), {
        entryId,
        accountId: line.accountId,
        accountClass: acct.class,
        normalBalance: acct.normalBalance,
        clientId: acct.clientId ?? null,
        debitKobo: line.debitKobo,
        creditKobo: line.creditKobo,
        date: input.postedDate,
        memo: line.memo,
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    for (const [accountId, delta] of deltaByAccount) {
      tx.update(accountsCol.doc(accountId), {
        cachedBalanceKobo: FieldValue.increment(delta),
        cachedAsOf: FieldValue.serverTimestamp(),
      });
    }

    if (input.idempotencyKey) {
      tx.set(refsCol.doc(refDocId(input.idempotencyKey)), {
        entryId,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return { entryId, idempotentReplay: false };
  });
}
