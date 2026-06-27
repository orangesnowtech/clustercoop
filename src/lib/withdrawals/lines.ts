/**
 * Withdrawal posting lines — PURE. The inverse of a deposit under the custodial
 * liability model: reduce what we owe the client (DR 2000:<uid>) and pay cash
 * out of the house bank (CR 1000). Single balanced entry, posted by Accounts.
 */
import { ACCOUNT_CODES, clientSubAccountId } from "@/lib/ledger/chart";
import type { PostLineInput } from "@/lib/ledger/types";
import { isValidKobo, type Kobo } from "@/lib/money";

export function buildWithdrawalLines(amountKobo: Kobo, uid: string): PostLineInput[] {
  if (!isValidKobo(amountKobo)) {
    throw new Error("buildWithdrawalLines: amount must be integer kobo");
  }
  if (amountKobo <= 0) throw new Error("buildWithdrawalLines: amount must be > 0");
  return [
    { accountId: clientSubAccountId(uid), debitKobo: amountKobo },
    { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, creditKobo: amountKobo },
  ];
}
