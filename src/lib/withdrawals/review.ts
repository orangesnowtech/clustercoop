/**
 * Withdrawal review (SERVER-ONLY) — compliance approve/reject and customer
 * cancel. Each transition is guarded INSIDE a Firestore transaction asserting
 * the exact current status, so steps can't be skipped or double-applied.
 * Approve also re-checks the available balance (best-effort early guard; the
 * authoritative overdraw guard is the sufficiency precondition at post).
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getClientLedger } from "@/lib/ledger/statements";
import { computeAvailableKobo } from "./available";
import { getLiveWithdrawals, WITHDRAWALS_COLLECTION } from "./queries";
import { LedgerError } from "@/lib/ledger/types";
import type { WithdrawalDoc } from "./types";

function col() {
  return getAdminDb().collection(WITHDRAWALS_COLLECTION);
}

/** Flip status from an expected value to a new one, transaction-guarded. */
async function transition(
  id: string,
  expected: WithdrawalDoc["status"],
  updates: Record<string, unknown>,
): Promise<void> {
  const ref = col().doc(id);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new LedgerError("unknown_withdrawal", "Withdrawal not found.");
    const cur = snap.data() as WithdrawalDoc;
    if (cur.status !== expected) {
      throw new LedgerError(
        "bad_status",
        `Withdrawal is '${cur.status}', expected '${expected}'.`,
      );
    }
    tx.update(ref, { ...updates, updatedAt: FieldValue.serverTimestamp() });
  });
}

export async function approveWithdrawal(id: string, actorUid: string): Promise<void> {
  const snap = await col().doc(id).get();
  if (!snap.exists) throw new LedgerError("unknown_withdrawal", "Withdrawal not found.");
  const wd = snap.data() as WithdrawalDoc;
  if (wd.status === "approved") return; // idempotent
  if (wd.status !== "requested") {
    throw new LedgerError("bad_status", `Withdrawal is '${wd.status}', cannot approve.`);
  }

  // Re-check the balance still covers this withdrawal alongside its siblings.
  const [{ balanceKobo }, live] = await Promise.all([
    getClientLedger(wd.uid),
    getLiveWithdrawals(wd.uid),
  ]);
  const others = live.filter((w) => w.id !== id);
  const availableExcludingThis = computeAvailableKobo(balanceKobo, others);
  if (wd.amountKobo > availableExcludingThis) {
    throw new LedgerError(
      "insufficient_funds",
      "Client's available balance no longer covers this withdrawal.",
    );
  }

  await transition(id, "requested", { status: "approved", reviewedBy: actorUid });
}

export async function rejectWithdrawal(
  id: string,
  actorUid: string,
  reason: string,
): Promise<void> {
  if (!reason?.trim()) throw new LedgerError("missing_reason", "A reason is required.");
  await transition(id, "requested", {
    status: "rejected",
    reviewedBy: actorUid,
    rejectionReason: reason.trim(),
  });
}

export async function cancelWithdrawal(id: string, actorUid: string): Promise<void> {
  const ref = col().doc(id);
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new LedgerError("unknown_withdrawal", "Withdrawal not found.");
    const cur = snap.data() as WithdrawalDoc;
    if (cur.uid !== actorUid) {
      throw new LedgerError("forbidden", "Not your withdrawal.");
    }
    if (cur.status !== "requested") {
      throw new LedgerError("bad_status", `Withdrawal is '${cur.status}', cannot cancel.`);
    }
    tx.update(ref, { status: "cancelled", updatedAt: FieldValue.serverTimestamp() });
  });
}
