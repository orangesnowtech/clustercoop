/**
 * KYC types + the pure transition guard. State machine:
 *   pending → in_review → approved | rejected
 * Webhooks advance pending→in_review; Compliance (the authoritative gate)
 * makes the approve/reject decision. admin/superadmin are break-glass.
 */
import type { Role } from "@/lib/roles";

export type KycStatus = "pending" | "in_review" | "approved" | "rejected";

/** MetaMap's advisory verdict (shown to the reviewer, never auto-acted on). */
export type MetamapVerdict = "verified" | "reviewNeeded" | "rejected";

export type KycTransition = "approve" | "reject";

export const TRANSITION_ROLES: Record<KycTransition, Role[]> = {
  approve: ["compliance", "admin", "superadmin"],
  reject: ["compliance", "admin", "superadmin"],
};

const FROM_STATUS: Record<KycTransition, KycStatus> = {
  approve: "in_review",
  reject: "in_review",
};

/** Pure guard: may `role` perform `transition` on a client currently in `from`? */
export function canReviewTransition(
  transition: KycTransition,
  from: KycStatus,
  role: Role,
): boolean {
  return FROM_STATUS[transition] === from && TRANSITION_ROLES[transition].includes(role);
}

export interface KycSessionDoc {
  nonce: string;
  uid: string;
  used: boolean;
  verificationId: string | null;
}

export interface ClientKyc {
  kycStatus: KycStatus;
  metamapVerdict: MetamapVerdict | null;
  verificationId: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
}
