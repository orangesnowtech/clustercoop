/**
 * Deposit posting lines — PURE, no Firestore. Builds the balanced journal
 * lines for a verified deposit under the custodial liability model.
 *
 * Paystack settles (gross − fee) into the house bank. Fee policy decides what
 * the client is credited:
 *  - client_bears (default): client credited NET (gross − fee); 2 lines.
 *  - house_absorbs: client credited GROSS; fee booked to Processor Charges; 3 lines.
 */
import { ACCOUNT_CODES, clientSubAccountId } from "@/lib/ledger/chart";
import type { PostLineInput } from "@/lib/ledger/types";
import { isValidKobo, type Kobo } from "@/lib/money";

export type FeePolicy = "client_bears" | "house_absorbs";

export function buildDepositLines(
  grossKobo: Kobo,
  feeKobo: Kobo,
  uid: string,
  policy: FeePolicy,
): PostLineInput[] {
  if (!isValidKobo(grossKobo) || !isValidKobo(feeKobo)) {
    throw new Error("buildDepositLines: amounts must be integer kobo");
  }
  if (grossKobo <= 0) throw new Error("buildDepositLines: gross must be > 0");
  if (feeKobo < 0 || feeKobo > grossKobo) {
    throw new Error("buildDepositLines: fee must be between 0 and gross");
  }

  const netKobo = grossKobo - feeKobo;
  const bank = ACCOUNT_CODES.HOUSE_BANK_PAYSTACK;
  const clientAcct = clientSubAccountId(uid);

  if (policy === "house_absorbs") {
    const lines: PostLineInput[] = [
      { accountId: bank, debitKobo: netKobo },
      { accountId: clientAcct, creditKobo: grossKobo },
    ];
    // Only book the fee expense when there is one (keeps the entry 2 lines if fee==0).
    if (feeKobo > 0) {
      lines.splice(1, 0, {
        accountId: ACCOUNT_CODES.PROCESSOR_CHARGES,
        debitKobo: feeKobo,
      });
    }
    return lines;
  }

  // client_bears: client credited only what cleared; fee never hits the books.
  return [
    { accountId: bank, debitKobo: netKobo },
    { accountId: clientAcct, creditKobo: netKobo },
  ];
}
