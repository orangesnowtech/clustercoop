/**
 * Withdrawal types + the pure transition guard. The state machine is:
 *   requested → approved → posted
 * with terminal branches rejected (from requested) and cancelled (from requested).
 * Separation of duties: customer requests, compliance approves/rejects, accounts
 * posts. admin/superadmin are break-glass on every staff step.
 */
import type { Kobo } from "@/lib/money";
import type { Role } from "@/lib/roles";

export type WithdrawalStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "cancelled"
  | "posted";

export interface WithdrawalDestination {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface WithdrawalDoc {
  id: string;
  uid: string;
  clientId: string; // == uid, so the ownsResource() Firestore rule applies
  amountKobo: Kobo;
  destination: WithdrawalDestination;
  status: WithdrawalStatus;
  requestedBy: string;
  availableAtRequestKobo: Kobo;
  reviewedBy: string | null;
  rejectionReason: string | null;
  postedBy: string | null;
  entryId: string | null;
}

export type WithdrawalTransition =
  | "approve"
  | "reject"
  | "cancel"
  | "post";

/** Roles permitted to perform each transition (break-glass for admins). */
export const TRANSITION_ROLES: Record<WithdrawalTransition, Role[]> = {
  approve: ["compliance", "admin", "superadmin"],
  reject: ["compliance", "admin", "superadmin"],
  cancel: ["customer"],
  post: ["accounts", "admin", "superadmin"],
};

const FROM_STATUS: Record<WithdrawalTransition, WithdrawalStatus> = {
  approve: "requested",
  reject: "requested",
  cancel: "requested",
  post: "approved",
};

/** Pure guard: may `role` perform `transition` on a doc currently in `from`? */
export function canTransition(
  transition: WithdrawalTransition,
  from: WithdrawalStatus,
  role: Role,
): boolean {
  return FROM_STATUS[transition] === from && TRANSITION_ROLES[transition].includes(role);
}
