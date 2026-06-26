/** Entry reads (SERVER-ONLY) for the admin ledger UI. */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "./accounts";
import type { JournalEntry, JournalLine } from "./types";

export async function listEntries(
  limit = 50,
): Promise<Array<JournalEntry>> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.journalEntries)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<JournalEntry, "id">) }));
}

export async function getEntry(id: string): Promise<JournalEntry | null> {
  const snap = await getAdminDb().collection(COLLECTIONS.journalEntries).doc(id).get();
  return snap.exists ? { id: snap.id, ...(snap.data() as Omit<JournalEntry, "id">) } : null;
}

export async function getEntryLines(entryId: string): Promise<JournalLine[]> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.journalLines)
    .where("entryId", "==", entryId)
    .get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<JournalLine, "id">) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}
