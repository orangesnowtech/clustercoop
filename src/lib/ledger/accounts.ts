/**
 * Account helpers (SERVER-ONLY) — seed the chart, provision per-client
 * sub-accounts, and read accounts. Writes here only create the account
 * skeleton (no balances); all balance movement happens through postEntry.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  SEED_ACCOUNTS,
  clientSubAccountId,
  clientSubAccountRecord,
  seedAccountRecord,
} from "./chart";
import type { Account } from "./types";

export const COLLECTIONS = {
  accounts: "accounts",
  journalEntries: "journalEntries",
  journalLines: "journalLines",
  ledgerRefs: "ledgerRefs",
} as const;

/** Create any missing seed control accounts. Idempotent (never resets balances). */
export async function seedChart(): Promise<{ created: string[]; existing: string[] }> {
  const db = getAdminDb();
  const col = db.collection(COLLECTIONS.accounts);
  const created: string[] = [];
  const existing: string[] = [];

  await Promise.all(
    SEED_ACCOUNTS.map(async (seed) => {
      const ref = col.doc(seed.code);
      const snap = await ref.get();
      if (snap.exists) {
        existing.push(seed.code);
        return;
      }
      await ref.set({
        ...seedAccountRecord(seed),
        cachedAsOf: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
      created.push(seed.code);
    }),
  );

  return { created, existing };
}

/**
 * Ensure a client's Client-Funds-Payable sub-account exists. Idempotent; safe
 * to call at registration and defensively before any client posting.
 */
export async function ensureClientAccounts(uid: string): Promise<string> {
  const db = getAdminDb();
  const id = clientSubAccountId(uid);
  const ref = db.collection(COLLECTIONS.accounts).doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      ...clientSubAccountRecord(uid),
      cachedAsOf: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return id;
}

/** Back-fill sub-accounts for every existing client doc. */
export async function backfillClientAccounts(): Promise<number> {
  const db = getAdminDb();
  const clients = await db.collection("clients").get();
  await Promise.all(clients.docs.map((d) => ensureClientAccounts(d.id)));
  return clients.size;
}

export async function getAccount(id: string): Promise<Account | null> {
  const snap = await getAdminDb().collection(COLLECTIONS.accounts).doc(id).get();
  return snap.exists ? (snap.data() as Account) : null;
}

export async function listAccounts(): Promise<Array<Account & { id: string }>> {
  const snap = await getAdminDb()
    .collection(COLLECTIONS.accounts)
    .orderBy("code")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Account) }));
}
