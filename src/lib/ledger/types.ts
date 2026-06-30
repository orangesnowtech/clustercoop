/**
 * Ledger types — the shared vocabulary for Cluster's double-entry ledger.
 *
 * Money is always integer kobo (see src/lib/money.ts). Posted entries are
 * immutable; corrections happen via reversal. These types are framework-free
 * (no Firestore imports) so the pure validation/balance modules can use them
 * and be unit-tested with plain node.
 */
import type { Kobo } from "@/lib/money";
import type { Role } from "@/lib/roles";

export type AccountClass =
  | "asset"
  | "liability"
  | "equity"
  | "income"
  | "expense";

export type NormalBalance = "debit" | "credit";

/** posted = live; reversed = has been contra'd; reversal = is a reversal entry. */
export type EntryStatus = "posted" | "reversed" | "reversal";

export type EntryType =
  | "deposit"
  | "withdrawal"
  | "allocation"
  | "redemption"
  | "valuation"
  | "fee"
  | "manual"
  | "reversal"
  | "opening";

export interface Account {
  code: string;
  name: string;
  class: AccountClass;
  normalBalance: NormalBalance;
  parentId: string | null;
  clientId: string | null;
  /** Set on per-product holding sub-accounts (2300:<uid>:<productId>). */
  productId?: string | null;
  /** Roll-up parents are never posted to directly. */
  isControl: boolean;
  active: boolean;
  currency: string;
  /** Reconstructable cache (signed, in the account's normal direction). */
  cachedBalanceKobo: Kobo;
}

export interface EntryReference {
  source: string;
  id: string;
}

export interface JournalEntry {
  id: string;
  status: EntryStatus;
  type: EntryType;
  reference: EntryReference;
  memo: string;
  reversalOf: string | null;
  reversedBy: string | null;
  totalDebitKobo: Kobo;
  totalCreditKobo: Kobo;
  lineCount: number;
  postedDate: string; // YYYY-MM-DD
  createdBy: string;
  createdByRole: Role | "system";
}

export interface JournalLine {
  id: string;
  entryId: string;
  accountId: string;
  accountClass: AccountClass;
  normalBalance: NormalBalance;
  clientId: string | null;
  debitKobo: Kobo;
  creditKobo: Kobo;
  date: string; // YYYY-MM-DD
  memo: string;
}

/** A single line as supplied to postEntry (before persistence). */
export interface PostLineInput {
  accountId: string;
  debitKobo?: Kobo;
  creditKobo?: Kobo;
  memo?: string;
}

/** Optional balance guard asserted atomically in the posting transaction. */
export interface AccountPrecondition {
  accountId: string;
  /** The account's cached balance must be >= this before posting. */
  minBalanceKobo: Kobo;
}

export interface PostEntryInput {
  /** When set, makes the posting idempotent (safe webhook/retry). */
  idempotencyKey?: string;
  type: EntryType;
  reference: EntryReference;
  memo?: string;
  postedDate: string; // YYYY-MM-DD
  createdBy: string;
  createdByRole: Role | "system";
  lines: PostLineInput[];
  /**
   * Sufficiency guards checked in the read phase (e.g. a withdrawal asserting
   * the client's balance covers the debit). Each account must be one the entry
   * already touches. Throws LedgerError("insufficient_funds") if unmet.
   */
  preconditions?: AccountPrecondition[];
}

export interface PostResult {
  entryId: string;
  idempotentReplay: boolean;
}

/** Typed ledger error so API routes can distinguish bad input (400) from 500. */
export class LedgerError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "LedgerError";
    this.code = code;
  }
}
