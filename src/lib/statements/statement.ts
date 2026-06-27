/**
 * Client statement (SERVER-ONLY) — the client's ledger lines enriched with
 * each entry's type, plus a summary. Built on getClientLedger; reads the
 * distinct journal entries to label rows (Deposit / Withdrawal / …).
 */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { getClientLedger } from "@/lib/ledger/statements";
import { COLLECTIONS } from "@/lib/ledger/accounts";
import type { EntryType, JournalEntry } from "@/lib/ledger/types";
import {
  buildStatementRows,
  summarize,
  type StatementRow,
  type StatementSummary,
} from "./rows";

export interface ClientStatement {
  rows: StatementRow[];
  summary: StatementSummary;
}

export async function getClientStatement(uid: string): Promise<ClientStatement> {
  const { rows: lines } = await getClientLedger(uid);

  // Batch-read the distinct entries to label each line by type.
  const entryIds = [...new Set(lines.map((l) => l.entryId))];
  const entryTypeById = new Map<string, EntryType>();
  if (entryIds.length > 0) {
    const db = getAdminDb();
    const snaps = await db.getAll(
      ...entryIds.map((id) => db.collection(COLLECTIONS.journalEntries).doc(id)),
    );
    for (const snap of snaps) {
      if (snap.exists) {
        entryTypeById.set(snap.id, (snap.data() as JournalEntry).type);
      }
    }
  }

  const rows = buildStatementRows(lines, entryTypeById);
  return { rows, summary: summarize(rows) };
}
