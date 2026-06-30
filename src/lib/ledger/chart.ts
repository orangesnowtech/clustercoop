/**
 * Chart of accounts — the seed control accounts and the per-client
 * sub-account scheme. Custodial liability model: client money is a liability
 * (Client Funds Payable, control 2000) with one sub-account per client; the
 * house bank is an asset.
 */
import { normalBalanceForClass } from "./balance";
import type { Account, AccountClass } from "./types";

/** Well-known control account codes referenced by the business flows. */
export const ACCOUNT_CODES = {
  HOUSE_BANK_PAYSTACK: "1000",
  HOUSE_BANK_OPERATING: "1010",
  SUSPENSE: "1900",
  CLIENT_FUNDS_PAYABLE: "2000", // control → per-client subs "2000:<uid>"
  WITHDRAWALS_PAYABLE: "2100",
  CLIENT_HOLDINGS: "2300", // control → per-client-per-product subs "2300:<uid>:<productId>"
  OWNERS_EQUITY: "3000",
  RETAINED_EARNINGS: "3900",
  INVESTMENT_INCOME: "4000",
  FEE_INCOME: "4100",
  PROCESSOR_CHARGES: "5000",
  RETURNS_DISTRIBUTED: "5100",
} as const;

interface SeedAccount {
  code: string;
  name: string;
  class: AccountClass;
  isControl: boolean;
}

/** The starter chart created by the seed routine. */
export const SEED_ACCOUNTS: SeedAccount[] = [
  { code: "1000", name: "House Bank — Paystack settlement", class: "asset", isControl: false },
  { code: "1010", name: "House Bank — Operating", class: "asset", isControl: false },
  { code: "1900", name: "Suspense / Unidentified receipts", class: "asset", isControl: false },
  { code: "2000", name: "Client Funds Payable", class: "liability", isControl: true },
  { code: "2100", name: "Withdrawals Payable", class: "liability", isControl: false },
  { code: "2300", name: "Client Investment Holdings", class: "liability", isControl: true },
  { code: "3000", name: "Owner's Equity", class: "equity", isControl: false },
  { code: "3900", name: "Retained Earnings", class: "equity", isControl: false },
  { code: "4000", name: "Investment Income / Returns", class: "income", isControl: false },
  { code: "4100", name: "Fee Income", class: "income", isControl: false },
  { code: "5000", name: "Processor Charges", class: "expense", isControl: false },
  { code: "5100", name: "Returns Distributed to Clients", class: "expense", isControl: false },
];

/** The Firestore doc id of a client's Client-Funds-Payable sub-account. */
export function clientSubAccountId(uid: string): string {
  return `${ACCOUNT_CODES.CLIENT_FUNDS_PAYABLE}:${uid}`;
}

/** Build a full Account record for a seed control account. */
export function seedAccountRecord(seed: SeedAccount): Account {
  return {
    code: seed.code,
    name: seed.name,
    class: seed.class,
    normalBalance: normalBalanceForClass(seed.class),
    parentId: null,
    clientId: null,
    isControl: seed.isControl,
    active: true,
    currency: "NGN",
    cachedBalanceKobo: 0,
  };
}

/** Build a per-client Client-Funds-Payable sub-account record. */
export function clientSubAccountRecord(uid: string): Account {
  return {
    code: clientSubAccountId(uid),
    name: `Client Funds Payable — ${uid}`,
    class: "liability",
    normalBalance: "credit",
    parentId: ACCOUNT_CODES.CLIENT_FUNDS_PAYABLE,
    clientId: uid,
    productId: null,
    isControl: false,
    active: true,
    currency: "NGN",
    cachedBalanceKobo: 0,
  };
}

/** The Firestore doc id of a client's holding sub-account for a product. */
export function holdingSubAccountId(uid: string, productId: string): string {
  return `${ACCOUNT_CODES.CLIENT_HOLDINGS}:${uid}:${productId}`;
}

/** Build a per-client-per-product Client-Investment-Holdings sub-account. */
export function holdingSubAccountRecord(uid: string, productId: string): Account {
  return {
    code: holdingSubAccountId(uid, productId),
    name: `Client Holdings — ${uid} — ${productId}`,
    class: "liability",
    normalBalance: "credit",
    parentId: ACCOUNT_CODES.CLIENT_HOLDINGS,
    clientId: uid,
    productId,
    isControl: false,
    active: true,
    currency: "NGN",
    cachedBalanceKobo: 0,
  };
}
