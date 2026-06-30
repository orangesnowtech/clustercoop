/**
 * Investment posting lines — PURE. Allocation/redemption move a client's claim
 * between cash (2000:<uid>) and a product holding (2300:<uid>:<productId>);
 * valuation books a gain/loss against the target sub-account vs Returns (5100).
 */
import { ACCOUNT_CODES, clientSubAccountId, holdingSubAccountId } from "@/lib/ledger/chart";
import type { PostLineInput } from "@/lib/ledger/types";
import { isValidKobo, type Kobo } from "@/lib/money";

function assertPositive(amountKobo: Kobo, label: string) {
  if (!isValidKobo(amountKobo)) throw new Error(`${label}: amount must be integer kobo`);
  if (amountKobo <= 0) throw new Error(`${label}: amount must be > 0`);
}

/** Invest: cash → holding. DR client cash / CR client holding. */
export function buildAllocationLines(
  uid: string,
  productId: string,
  amountKobo: Kobo,
): PostLineInput[] {
  assertPositive(amountKobo, "buildAllocationLines");
  return [
    { accountId: clientSubAccountId(uid), debitKobo: amountKobo },
    { accountId: holdingSubAccountId(uid, productId), creditKobo: amountKobo },
  ];
}

/** Redeem: holding → cash. DR client holding / CR client cash. */
export function buildRedemptionLines(
  uid: string,
  productId: string,
  amountKobo: Kobo,
): PostLineInput[] {
  assertPositive(amountKobo, "buildRedemptionLines");
  return [
    { accountId: holdingSubAccountId(uid, productId), debitKobo: amountKobo },
    { accountId: clientSubAccountId(uid), creditKobo: amountKobo },
  ];
}

/**
 * Valuation: book a signed gain against a target sub-account vs Returns (5100).
 * gain > 0 → DR 5100 / CR target; gain < 0 → DR target / CR 5100. gain must
 * be non-zero (callers skip zero-gain clients).
 */
export function buildValuationLines(targetAccountId: string, gainKobo: Kobo): PostLineInput[] {
  if (!isValidKobo(gainKobo) || gainKobo === 0) {
    throw new Error("buildValuationLines: gain must be a non-zero integer kobo");
  }
  const amount = Math.abs(gainKobo);
  return gainKobo > 0
    ? [
        { accountId: ACCOUNT_CODES.RETURNS_DISTRIBUTED, debitKobo: amount },
        { accountId: targetAccountId, creditKobo: amount },
      ]
    : [
        { accountId: targetAccountId, debitKobo: amount },
        { accountId: ACCOUNT_CODES.RETURNS_DISTRIBUTED, creditKobo: amount },
      ];
}
