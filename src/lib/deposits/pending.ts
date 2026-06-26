/**
 * Pending deposits (SERVER-ONLY). The deposit doc is created BEFORE payment,
 * keyed by a server-minted reference, binding the reference to its owner uid —
 * the trust anchor that verification reads (never anything the browser sends).
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Kobo } from "@/lib/money";
import type { FeePolicy } from "./lines";

export const DEPOSITS_COLLECTION = "deposits";

/** Default fee policy for new deposits (confirmed: client bears the fee). */
export const DEFAULT_FEE_POLICY: FeePolicy = "client_bears";

export type DepositStatus = "pending" | "success" | "failed";

export interface DepositDoc {
  reference: string;
  uid: string;
  intendedKobo: Kobo;
  email: string;
  policy: FeePolicy;
  status: DepositStatus;
  entryId: string | null;
  grossKobo: Kobo | null;
  feeKobo: Kobo | null;
  creditedKobo: Kobo | null;
  paidAt: string | null;
  channel: string | null;
  failureReason: string | null;
  completedVia: "callback" | "webhook" | null;
}

/** Create the pending deposit record and return its (server-minted) reference. */
export async function createPendingDeposit(input: {
  uid: string;
  intendedKobo: Kobo;
  email: string;
  policy?: FeePolicy;
}): Promise<{ reference: string }> {
  const reference = `dep_${input.uid}_${randomUUID()}`;
  await getAdminDb()
    .collection(DEPOSITS_COLLECTION)
    .doc(reference)
    .set({
      reference,
      uid: input.uid,
      intendedKobo: input.intendedKobo,
      email: input.email,
      policy: input.policy ?? DEFAULT_FEE_POLICY,
      status: "pending",
      entryId: null,
      grossKobo: null,
      feeKobo: null,
      creditedKobo: null,
      paidAt: null,
      channel: null,
      failureReason: null,
      completedVia: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  return { reference };
}

export async function getClientDeposits(
  uid: string,
  limit = 10,
): Promise<DepositDoc[]> {
  const snap = await getAdminDb()
    .collection(DEPOSITS_COLLECTION)
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data() as DepositDoc);
}

/**
 * Gate deposits before charging (reject before money moves, never after).
 * KYC is not yet enforced; flip DEPOSITS_REQUIRE_KYC when the KYC flow ships.
 */
export async function assertCanDeposit(uid: string): Promise<void> {
  if (process.env.DEPOSITS_REQUIRE_KYC !== "true") return;
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  const kycStatus = snap.data()?.kycStatus;
  if (kycStatus !== "approved") {
    throw new Error("KYC approval is required before depositing.");
  }
}
