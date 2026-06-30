/**
 * KYC gate (SERVER-ONLY) for withdrawals. Mirrors assertCanDeposit in
 * deposits/pending.ts. Off unless WITHDRAWALS_REQUIRE_KYC === "true".
 */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { LedgerError } from "@/lib/ledger/types";

export async function assertCanWithdraw(uid: string): Promise<void> {
  if (process.env.WITHDRAWALS_REQUIRE_KYC !== "true") return;
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  if (snap.data()?.kycStatus !== "approved") {
    throw new LedgerError(
      "kyc_required",
      "Identity verification must be approved before withdrawing.",
    );
  }
}

export async function assertCanInvest(uid: string): Promise<void> {
  if (process.env.INVESTMENTS_REQUIRE_KYC !== "true") return;
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  if (snap.data()?.kycStatus !== "approved") {
    throw new LedgerError(
      "kyc_required",
      "Identity verification must be approved before investing.",
    );
  }
}
