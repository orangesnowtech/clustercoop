/**
 * recordKycWebhook (SERVER-ONLY) — the convergence point for MetaMap webhook
 * results. Resolves the nonce→uid binding, then advances the client to
 * `in_review` (with MetaMap's verdict attached) inside a transaction that
 * never regresses an already-decided (approved/rejected) client. Idempotent.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { KYC_SESSIONS_COLLECTION } from "./session";
import type { KycSessionDoc, KycStatus, MetamapVerdict } from "./types";

/** MetaMap events that carry a terminal identity verdict. */
const TERMINAL_EVENTS = new Set(["verification_completed", "verification_updated"]);

export interface KycWebhookInput {
  nonce: string | null;
  eventName: string;
  verdict: MetamapVerdict | null;
  verificationId: string | null;
  resource: string | null;
}

export interface KycWebhookResult {
  applied: boolean;
  reason?: string;
}

export async function recordKycWebhook(
  input: KycWebhookInput,
): Promise<KycWebhookResult> {
  // Non-terminal lifecycle events: acknowledge, do nothing.
  if (!TERMINAL_EVENTS.has(input.eventName) || !input.verdict) {
    return { applied: false, reason: "non_terminal_event" };
  }
  if (!input.nonce) return { applied: false, reason: "no_nonce" };

  const db = getAdminDb();
  const sessionRef = db.collection(KYC_SESSIONS_COLLECTION).doc(input.nonce);

  return db.runTransaction(async (tx) => {
    const sessionSnap = await tx.get(sessionRef);
    if (!sessionSnap.exists) return { applied: false, reason: "unknown_nonce" };
    const session = sessionSnap.data() as KycSessionDoc;

    const clientRef = db.collection("clients").doc(session.uid);
    const clientSnap = await tx.get(clientRef);
    const status = (clientSnap.data()?.kycStatus as KycStatus) ?? "pending";

    // Regression guard: never overwrite a Compliance decision.
    if (status === "approved" || status === "rejected") {
      return { applied: false, reason: "already_decided" };
    }

    tx.set(
      clientRef,
      {
        kycStatus: "in_review",
        metamapVerdict: input.verdict,
        verificationId: input.verificationId,
        metamapResource: input.resource ?? null,
        kycUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.update(sessionRef, {
      used: true,
      verificationId: input.verificationId,
      consumedAt: FieldValue.serverTimestamp(),
    });
    return { applied: true };
  });
}
