/**
 * Entry validation — PURE, no Firestore. Enforces the double-entry invariants
 * before anything touches the database. Unit-tested exhaustively.
 */
import { isValidKobo, sumKobo, type Kobo } from "@/lib/money";
import { LedgerError, type PostLineInput } from "./types";

/** Cap lines so a single transaction stays well under Firestore's 500-op limit. */
export const MAX_LINES = 120;

export interface NormalizedLine {
  accountId: string;
  debitKobo: Kobo;
  creditKobo: Kobo;
  memo: string;
}

export interface ValidatedEntry {
  lines: NormalizedLine[];
  totalDebitKobo: Kobo;
  totalCreditKobo: Kobo;
}

/**
 * Validate and normalize entry lines. Throws LedgerError on any violation:
 * line count, integer kobo, non-negative, exactly one side > 0, balanced,
 * and a positive total. Returns normalized lines + equal totals.
 */
export function validateEntryLines(lines: PostLineInput[]): ValidatedEntry {
  if (!Array.isArray(lines) || lines.length < 2) {
    throw new LedgerError("too_few_lines", "An entry needs at least two lines.");
  }
  if (lines.length > MAX_LINES) {
    throw new LedgerError(
      "too_many_lines",
      `An entry may not exceed ${MAX_LINES} lines.`,
    );
  }

  const normalized: NormalizedLine[] = lines.map((line, i) => {
    const debitKobo = line.debitKobo ?? 0;
    const creditKobo = line.creditKobo ?? 0;

    if (!line.accountId) {
      throw new LedgerError("missing_account", `Line ${i + 1} has no account.`);
    }
    if (!isValidKobo(debitKobo) || !isValidKobo(creditKobo)) {
      throw new LedgerError(
        "non_integer",
        `Line ${i + 1} amounts must be whole kobo.`,
      );
    }
    if (debitKobo < 0 || creditKobo < 0) {
      throw new LedgerError(
        "negative_amount",
        `Line ${i + 1} amounts must be non-negative.`,
      );
    }
    // Exactly one side strictly positive.
    const debitSide = debitKobo > 0;
    const creditSide = creditKobo > 0;
    if (debitSide === creditSide) {
      throw new LedgerError(
        "one_side",
        `Line ${i + 1} must have exactly one of debit or credit > 0.`,
      );
    }
    return { accountId: line.accountId, debitKobo, creditKobo, memo: line.memo ?? "" };
  });

  const totalDebitKobo = sumKobo(normalized.map((l) => l.debitKobo));
  const totalCreditKobo = sumKobo(normalized.map((l) => l.creditKobo));

  if (totalDebitKobo !== totalCreditKobo) {
    throw new LedgerError(
      "unbalanced",
      `Entry is unbalanced: debits ${totalDebitKobo} ≠ credits ${totalCreditKobo}.`,
    );
  }
  if (totalDebitKobo <= 0) {
    throw new LedgerError("zero_total", "Entry total must be greater than zero.");
  }

  return { lines: normalized, totalDebitKobo, totalCreditKobo };
}
