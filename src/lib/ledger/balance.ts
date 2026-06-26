/**
 * Balance math — PURE, no Firestore. The single chokepoint for ledger sign
 * logic, so the rest of the engine never re-derives direction. Unit-tested
 * across every class × debit/credit combination.
 */
import { isValidKobo, type Kobo } from "@/lib/money";
import type { AccountClass, NormalBalance } from "./types";

/** Asset/expense are debit-normal; liability/equity/income are credit-normal. */
export function normalBalanceForClass(cls: AccountClass): NormalBalance {
  return cls === "asset" || cls === "expense" ? "debit" : "credit";
}

/**
 * Signed change to an account's cached balance (kept in its normal direction).
 * Debit-normal: +debit, −credit. Credit-normal: +credit, −debit.
 */
export function signedDelta(
  normalBalance: NormalBalance,
  debitKobo: Kobo,
  creditKobo: Kobo,
): Kobo {
  if (!isValidKobo(debitKobo) || !isValidKobo(creditKobo)) {
    throw new Error("signedDelta: amounts must be integer kobo");
  }
  return normalBalance === "debit"
    ? debitKobo - creditKobo
    : creditKobo - debitKobo;
}

export function negateKobo(value: Kobo): Kobo {
  if (!isValidKobo(value)) throw new Error("negateKobo: invalid kobo");
  return -value;
}

/**
 * Split a signed cached balance into trial-balance debit/credit columns. A
 * balance in its normal direction shows in that column; an abnormal (negative)
 * balance flips to the opposite column. Never shows a negative number.
 */
export function trialBalanceColumns(
  normalBalance: NormalBalance,
  cachedBalanceKobo: Kobo,
): { debitKobo: Kobo; creditKobo: Kobo } {
  const bal = cachedBalanceKobo;
  if (normalBalance === "debit") {
    return { debitKobo: Math.max(bal, 0), creditKobo: Math.max(-bal, 0) };
  }
  return { debitKobo: Math.max(-bal, 0), creditKobo: Math.max(bal, 0) };
}
