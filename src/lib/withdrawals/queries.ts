/** Withdrawal queries (SERVER-ONLY). */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { WithdrawalDoc, WithdrawalStatus } from "./types";

export const WITHDRAWALS_COLLECTION = "withdrawals";

/** Statuses that still reserve funds against the client's balance. */
export const LIVE_STATUSES: WithdrawalStatus[] = ["requested", "approved"];

export async function getClientWithdrawals(
  uid: string,
  limit = 20,
): Promise<WithdrawalDoc[]> {
  const snap = await getAdminDb()
    .collection(WITHDRAWALS_COLLECTION)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as WithdrawalDoc);
}

/**
 * The reservation set for a client: requested/approved, not yet settled.
 * Query by uid only (single-field auto-index) and filter the small per-client
 * set in memory, avoiding an extra composite index.
 */
export async function getLiveWithdrawals(uid: string): Promise<WithdrawalDoc[]> {
  const snap = await getAdminDb()
    .collection(WITHDRAWALS_COLLECTION)
    .where("uid", "==", uid)
    .get();
  return snap.docs
    .map((d) => d.data() as WithdrawalDoc)
    .filter((w) => LIVE_STATUSES.includes(w.status));
}

/** Open queue for the back office: everything awaiting approval or posting. */
export async function listOpenWithdrawals(limit = 100): Promise<WithdrawalDoc[]> {
  const snap = await getAdminDb()
    .collection(WITHDRAWALS_COLLECTION)
    .where("status", "in", LIVE_STATUSES)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as WithdrawalDoc);
}
