/**
 * Statements (SERVER-ONLY) — a client's ledger: their journal lines in date
 * order with a running balance. Reads lines by clientId (the denormalized
 * field that the customer Firestore rule also keys on).
 */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { signedDelta } from "./balance";
import { COLLECTIONS } from "./accounts";
import type { JournalLine } from "./types";
import type { Kobo } from "@/lib/money";

export interface StatementRow extends JournalLine {
  runningBalanceKobo: Kobo;
}

/** A client's movements (their Client-Funds-Payable sub-account lines). */
export async function getClientLedger(uid: string): Promise<{
  rows: StatementRow[];
  balanceKobo: Kobo;
}> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.journalLines)
    .where("clientId", "==", uid)
    .orderBy("date")
    .get();

  let running = 0;
  const rows: StatementRow[] = snap.docs.map((doc) => {
    const line = doc.data() as JournalLine;
    running += signedDelta(line.normalBalance, line.debitKobo, line.creditKobo);
    return { ...line, id: doc.id, runningBalanceKobo: running };
  });

  return { rows, balanceKobo: running };
}
