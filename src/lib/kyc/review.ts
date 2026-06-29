/**
 * KYC review (SERVER-ONLY) — Compliance's authoritative approve/reject. Each is
 * a transaction-guarded flip asserting the client is `in_review`, idempotent if
 * already in the target state. Mirrors the withdrawal review pattern.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { LedgerError } from "@/lib/ledger/types";
import type { KycStatus } from "./types";

function clientRef(uid: string) {
  return getAdminDb().collection("clients").doc(uid);
}

async function decide(
  uid: string,
  target: "approved" | "rejected",
  updates: Record<string, unknown>,
): Promise<void> {
  const ref = clientRef(uid);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new LedgerError("unknown_client", "Client not found.");
    const status = (snap.data()!.kycStatus as KycStatus) ?? "pending";
    if (status === target) return; // idempotent
    if (status !== "in_review") {
      throw new LedgerError(
        "bad_status",
        `KYC is '${status}', must be 'in_review' to ${target === "approved" ? "approve" : "reject"}.`,
      );
    }
    tx.set(
      ref,
      { kycStatus: target, ...updates, kycUpdatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  });
}

export async function approveKyc(uid: string, actorUid: string): Promise<void> {
  await decide(uid, "approved", { reviewedBy: actorUid, rejectionReason: null });
}

export async function rejectKyc(
  uid: string,
  actorUid: string,
  reason: string,
): Promise<void> {
  if (!reason?.trim()) throw new LedgerError("missing_reason", "A reason is required.");
  await decide(uid, "rejected", { reviewedBy: actorUid, rejectionReason: reason.trim() });
}
