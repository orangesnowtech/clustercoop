/**
 * Available-balance math — PURE, no Firestore. A client's available balance is
 * their ledger balance minus everything already reserved by live (not yet
 * settled or killed) withdrawal requests. This is the first overdraw guard;
 * the authoritative one is the sufficiency precondition at post time.
 */
import { isValidKobo, sumKobo, type Kobo } from "@/lib/money";

export const MIN_WITHDRAWAL_KOBO = 100; // ₦1
export const MAX_WITHDRAWAL_KOBO = 10_000_000 * 100; // ₦10,000,000

/** Withdrawals that still reserve funds: requested or approved (not yet posted/killed). */
export interface ReservingWithdrawal {
  amountKobo: Kobo;
}

export function computeAvailableKobo(
  ledgerBalanceKobo: Kobo,
  liveWithdrawals: ReservingWithdrawal[],
): Kobo {
  const reserved = sumKobo(liveWithdrawals.map((w) => w.amountKobo));
  return ledgerBalanceKobo - reserved;
}

export interface RequestValidation {
  ok: boolean;
  error?: string;
}

/** Validate a requested amount against the client's available balance. */
export function validateWithdrawalRequest(
  amountKobo: number,
  availableKobo: Kobo,
): RequestValidation {
  if (!isValidKobo(amountKobo)) return { ok: false, error: "Amount must be whole kobo." };
  if (amountKobo < MIN_WITHDRAWAL_KOBO) return { ok: false, error: "Amount is too small." };
  if (amountKobo > MAX_WITHDRAWAL_KOBO) return { ok: false, error: "Amount is too large." };
  if (amountKobo > availableKobo) return { ok: false, error: "Amount exceeds your available balance." };
  return { ok: true };
}
