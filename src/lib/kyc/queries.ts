/** KYC queries (SERVER-ONLY). */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { ClientKyc, KycStatus } from "./types";

export interface KycQueueItem extends ClientKyc {
  uid: string;
  email: string | null;
}

/** The Compliance queue: clients awaiting a decision. */
export async function listKycInReview(limit = 100): Promise<KycQueueItem[]> {
  const snap = await getAdminDb()
    .collection("clients")
    .where("kycStatus", "==", "in_review")
    .limit(limit)
    .get();
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: d.id,
      email: data.email ?? null,
      kycStatus: data.kycStatus as KycStatus,
      metamapVerdict: data.metamapVerdict ?? null,
      verificationId: data.verificationId ?? null,
      metamapResource: data.metamapResource ?? null,
      reviewedBy: data.reviewedBy ?? null,
      rejectionReason: data.rejectionReason ?? null,
    };
  });
}

/** A single client's KYC state (customer banner / verify page). */
export async function getClientKyc(uid: string): Promise<ClientKyc> {
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  const data = snap.data() ?? {};
  return {
    kycStatus: (data.kycStatus as KycStatus) ?? "pending",
    metamapVerdict: data.metamapVerdict ?? null,
    verificationId: data.verificationId ?? null,
    metamapResource: data.metamapResource ?? null,
    reviewedBy: data.reviewedBy ?? null,
    rejectionReason: data.rejectionReason ?? null,
  };
}
