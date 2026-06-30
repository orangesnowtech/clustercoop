/**
 * Valuation rate math — PURE, integer kobo. A rate is in basis points
 * (1% = 100 bps), signed: +800 = +8% gain, -300 = -3% loss.
 */
import { isValidKobo, type Kobo } from "@/lib/money";

/**
 * Signed gain/loss for a balance at a bps rate. Rounds the magnitude half-up
 * then re-applies the sign (symmetric for gains and losses), so the result is
 * always whole kobo and never fractional.
 */
export function applyRateBps(balanceKobo: Kobo, rateBps: number): Kobo {
  if (!isValidKobo(balanceKobo)) {
    throw new Error("applyRateBps: balance must be integer kobo");
  }
  if (!Number.isInteger(rateBps)) {
    throw new Error("applyRateBps: rateBps must be an integer");
  }
  const sign = balanceKobo < 0 ? -1 : 1;
  const magnitude = Math.abs(balanceKobo) * Math.abs(rateBps);
  // Half-up rounding of (magnitude / 10000).
  const rounded = Math.floor((magnitude + 5000) / 10000);
  const rateSign = rateBps < 0 ? -1 : 1;
  return sign * rateSign * rounded;
}
