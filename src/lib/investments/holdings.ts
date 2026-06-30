/**
 * Holdings (SERVER-ONLY). The ledger sub-account 2300:<uid>:<productId> is the
 * source of truth for a holding's value; `holdings/{uid}_{productId}` is a
 * projection (costBasis + cached value + productId) for fast portfolio reads
 * and for enumerating a product's holders during a valuation run.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAccount, COLLECTIONS } from "@/lib/ledger/accounts";
import { holdingSubAccountId, holdingSubAccountRecord } from "@/lib/ledger/chart";
import type { Kobo } from "@/lib/money";

export const HOLDINGS_COLLECTION = "holdings";

export function holdingDocId(uid: string, productId: string): string {
  return `${uid}_${productId}`;
}

export interface HoldingDoc {
  uid: string;
  productId: string;
  costBasisKobo: Kobo;
  currentValueKobo: Kobo;
}

/** Create the holding ledger sub-account if missing. Idempotent. */
export async function ensureHoldingAccount(uid: string, productId: string): Promise<string> {
  const db = getAdminDb();
  const id = holdingSubAccountId(uid, productId);
  const ref = db.collection(COLLECTIONS.accounts).doc(id);
  if (!(await ref.get()).exists) {
    await ref.set({
      ...holdingSubAccountRecord(uid, productId),
      cachedAsOf: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  return id;
}

/** Refresh the projection: currentValue from the ledger; bump costBasis by delta. */
export async function syncHoldingProjection(
  uid: string,
  productId: string,
  costDeltaKobo: Kobo,
): Promise<void> {
  const db = getAdminDb();
  const acct = await getAccount(holdingSubAccountId(uid, productId));
  const currentValueKobo = acct?.cachedBalanceKobo ?? 0;
  const ref = db.collection(HOLDINGS_COLLECTION).doc(holdingDocId(uid, productId));
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const prevCost = (snap.data()?.costBasisKobo as number) ?? 0;
    tx.set(
      ref,
      {
        uid,
        productId,
        costBasisKobo: Math.max(prevCost + costDeltaKobo, 0),
        currentValueKobo,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}

/** Refresh only the cached value from the ledger (after a valuation). */
export async function refreshHoldingValue(uid: string, productId: string): Promise<void> {
  const acct = await getAccount(holdingSubAccountId(uid, productId));
  await getAdminDb()
    .collection(HOLDINGS_COLLECTION)
    .doc(holdingDocId(uid, productId))
    .set(
      { currentValueKobo: acct?.cachedBalanceKobo ?? 0, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}

/** A client's holdings (projection rows). */
export async function getClientHoldings(uid: string): Promise<HoldingDoc[]> {
  const snap = await getAdminDb()
    .collection(HOLDINGS_COLLECTION)
    .where("uid", "==", uid)
    .get();
  return snap.docs
    .map((d) => d.data() as HoldingDoc)
    .filter((h) => h.currentValueKobo > 0 || h.costBasisKobo > 0);
}

/** Holders of a product (for a valuation run). */
export async function listProductHolders(productId: string): Promise<HoldingDoc[]> {
  const snap = await getAdminDb()
    .collection(HOLDINGS_COLLECTION)
    .where("productId", "==", productId)
    .get();
  return snap.docs.map((d) => d.data() as HoldingDoc);
}
