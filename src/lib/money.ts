/**
 * Money — integer minor units (kobo) only. NEVER floats.
 *
 * All amounts across the ledger, Paystack and statements are stored and passed
 * around as whole-number kobo (1 naira = 100 kobo). These helpers exist so that
 * arithmetic stays in integers and formatting happens only at the display edge.
 */

/** A monetary amount in integer minor units (kobo). */
export type Kobo = number;

const KOBO_PER_NAIRA = 100;

export function isValidKobo(value: number): boolean {
  return Number.isSafeInteger(value);
}

function assertKobo(value: number): asserts value is Kobo {
  if (!isValidKobo(value)) {
    throw new Error(`Amount must be a safe integer kobo value, got: ${value}`);
  }
}

/** Convert a naira figure (e.g. from a form) into integer kobo. */
export function nairaToKobo(naira: number): Kobo {
  const kobo = Math.round(naira * KOBO_PER_NAIRA);
  assertKobo(kobo);
  return kobo;
}

/** Convert integer kobo back to a naira number — for display/export only. */
export function koboToNaira(kobo: Kobo): number {
  assertKobo(kobo);
  return kobo / KOBO_PER_NAIRA;
}

/** Format kobo as a localized currency string (display edge only). */
export function formatKobo(kobo: Kobo, currency = "NGN"): string {
  assertKobo(kobo);
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
  }).format(kobo / KOBO_PER_NAIRA);
}

/** Sum kobo amounts, staying in integer space. */
export function sumKobo(amounts: Kobo[]): Kobo {
  const total = amounts.reduce((acc, n) => {
    assertKobo(n);
    return acc + n;
  }, 0);
  assertKobo(total);
  return total;
}
