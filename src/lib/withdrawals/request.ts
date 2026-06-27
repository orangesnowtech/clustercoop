/**
 * Withdrawal request (SERVER-ONLY) — the customer-initiated first step.
 * Validates against AVAILABLE balance (ledger balance minus funds already
 * reserved by live requests) before creating the doc in `requested` status.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getClientLedger } from "@/lib/ledger/statements";
import { ensureClientAccounts } from "@/lib/ledger/accounts";
import { LedgerError } from "@/lib/ledger/types";
import type { Kobo } from "@/lib/money";
import { computeAvailableKobo, validateWithdrawalRequest } from "./available";
import { getLiveWithdrawals, WITHDRAWALS_COLLECTION } from "./queries";
import type { WithdrawalDestination } from "./types";

export async function createWithdrawalRequest(input: {
  uid: string;
  amountKobo: Kobo;
  destination: WithdrawalDestination;
}): Promise<{ id: string }> {
  await ensureClientAccounts(input.uid);

  const [{ balanceKobo }, live] = await Promise.all([
    getClientLedger(input.uid),
    getLiveWithdrawals(input.uid),
  ]);
  const availableKobo = computeAvailableKobo(balanceKobo, live);

  const check = validateWithdrawalRequest(input.amountKobo, availableKobo);
  if (!check.ok) {
    throw new LedgerError("invalid_request", check.error ?? "Invalid request.");
  }

  const id = `wd_${input.uid}_${randomUUID()}`;
  await getAdminDb()
    .collection(WITHDRAWALS_COLLECTION)
    .doc(id)
    .set({
      id,
      uid: input.uid,
      clientId: input.uid,
      amountKobo: input.amountKobo,
      destination: input.destination,
      status: "requested",
      requestedBy: input.uid,
      availableAtRequestKobo: availableKobo,
      reviewedBy: null,
      rejectionReason: null,
      postedBy: null,
      entryId: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return { id };
}
