/**
 * KYC sessions (SERVER-ONLY) — the trust anchor. A nonce is minted server-side
 * BEFORE the browser launches MetaMap, binding nonce→uid. The webhook resolves
 * the verification to a user via this nonce, never via the (untrusted) body.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";

export const KYC_SESSIONS_COLLECTION = "kycSessions";

export async function startKycSession(uid: string): Promise<{ nonce: string }> {
  const nonce = randomUUID();
  await getAdminDb()
    .collection(KYC_SESSIONS_COLLECTION)
    .doc(nonce)
    .set({
      nonce,
      uid,
      used: false,
      verificationId: null,
      createdAt: FieldValue.serverTimestamp(),
      consumedAt: null,
    });
  return { nonce };
}
