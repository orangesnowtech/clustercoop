/**
 * Reversal / contra (SERVER-ONLY) — the only way to correct a posted entry.
 *
 * Creates a new entry with swapped debit/credit lines, links it to the
 * original, and undoes the balance deltas. The original entry's lines and
 * amounts are NEVER edited — only its status and reversedBy link change.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { signedDelta, negateKobo } from "./balance";
import { COLLECTIONS } from "./accounts";
import type { Role } from "@/lib/roles";
import {
  LedgerError,
  type JournalEntry,
  type JournalLine,
  type PostResult,
} from "./types";

export interface ReverseInput {
  entryId: string;
  reason: string;
  reversalDate: string; // YYYY-MM-DD
  createdBy: string;
  createdByRole: Role | "system";
}

export async function reverseEntry(input: ReverseInput): Promise<PostResult> {
  const db = getAdminDb();
  const accountsCol = db.collection(COLLECTIONS.accounts);
  const entriesCol = db.collection(COLLECTIONS.journalEntries);
  const linesCol = db.collection(COLLECTIONS.journalLines);

  const reversalId = `${input.entryId}_rev`;

  return db.runTransaction(async (tx) => {
    // ================= READ PHASE =================
    const origSnap = await tx.get(entriesCol.doc(input.entryId));
    if (!origSnap.exists) {
      throw new LedgerError("unknown_entry", `Entry ${input.entryId} does not exist.`);
    }
    const orig = origSnap.data() as JournalEntry;
    // Only a live posted entry can be reversed (blocks double-reversal and
    // reversing a reversal — those have status 'reversed'/'reversal').
    if (orig.status !== "posted") {
      throw new LedgerError(
        "not_reversible",
        `Entry ${input.entryId} has status '${orig.status}' and cannot be reversed.`,
      );
    }

    const origLinesSnap = await tx.get(
      linesCol.where("entryId", "==", input.entryId),
    );
    const origLines = origLinesSnap.docs.map((d) => d.data() as JournalLine);
    if (origLines.length === 0) {
      throw new LedgerError("no_lines", `Entry ${input.entryId} has no lines.`);
    }

    // Negated deltas, aggregated per account.
    const deltaByAccount = new Map<string, number>();
    for (const line of origLines) {
      const original = signedDelta(line.normalBalance, line.debitKobo, line.creditKobo);
      deltaByAccount.set(
        line.accountId,
        (deltaByAccount.get(line.accountId) ?? 0) + negateKobo(original),
      );
    }

    // ================= WRITE PHASE =================
    const reversalRef = entriesCol.doc(reversalId);
    tx.create(reversalRef, {
      status: "reversal",
      type: "reversal",
      reference: { source: "reversal", id: input.entryId },
      memo: input.reason,
      reversalOf: input.entryId,
      reversedBy: null,
      totalDebitKobo: orig.totalCreditKobo, // swapped, still equal
      totalCreditKobo: orig.totalDebitKobo,
      lineCount: origLines.length,
      postedDate: input.reversalDate,
      createdBy: input.createdBy,
      createdByRole: input.createdByRole,
      createdAt: FieldValue.serverTimestamp(),
    });

    origLines.forEach((line, i) => {
      tx.set(linesCol.doc(`${reversalId}_${i}`), {
        entryId: reversalId,
        accountId: line.accountId,
        accountClass: line.accountClass,
        normalBalance: line.normalBalance,
        clientId: line.clientId ?? null,
        debitKobo: line.creditKobo, // SWAP
        creditKobo: line.debitKobo,
        date: input.reversalDate,
        memo: `Reversal: ${line.memo ?? ""}`.trim(),
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    for (const [accountId, delta] of deltaByAccount) {
      tx.update(accountsCol.doc(accountId), {
        cachedBalanceKobo: FieldValue.increment(delta),
        cachedAsOf: FieldValue.serverTimestamp(),
      });
    }

    tx.update(entriesCol.doc(input.entryId), {
      status: "reversed",
      reversedBy: reversalId,
    });

    return { entryId: reversalId, idempotentReplay: false };
  });
}
