/**
 * Admin overview (SERVER-ONLY) — read-only operational aggregates for the
 * back-office dashboard. Client funds (AUM) and cash-at-bank are summed from
 * the ledger account balances (the per-client/per-product sub-accounts);
 * counts come from the respective collections.
 */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import { ACCOUNT_CODES } from "@/lib/ledger/chart";
import { getTrialBalance } from "@/lib/ledger/trialBalance";
import type { Account, EntryType } from "@/lib/ledger/types";
import type { Kobo } from "@/lib/money";

export interface RecentEntry {
  id: string;
  type: EntryType;
  totalKobo: Kobo;
  postedDate: string;
  createdByRole: string;
}

export interface AdminOverview {
  clientCashKobo: Kobo;
  clientHoldingsKobo: Kobo;
  aumKobo: Kobo; // total client funds = cash + holdings
  bankKobo: Kobo; // firm cash at bank (asset)
  clientCount: number;
  pendingKyc: number;
  pendingWithdrawals: number;
  activeProducts: number;
  trialBalanced: boolean;
  recent: RecentEntry[];
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const db = getAdminDb();
  const [accountsSnap, clients, kyc, withdrawals, products, trial, recentSnap] =
    await Promise.all([
      db.collection("accounts").get(),
      db.collection("clients").count().get(),
      db.collection("clients").where("kycStatus", "==", "in_review").count().get(),
      db.collection("withdrawals").where("status", "in", ["requested", "approved"]).count().get(),
      db.collection("products").where("status", "==", "active").count().get(),
      getTrialBalance(),
      db.collection("journalEntries").orderBy("createdAt", "desc").limit(8).get(),
    ]);

  let clientCashKobo = 0;
  let clientHoldingsKobo = 0;
  let bankKobo = 0;
  accountsSnap.forEach((d) => {
    const a = d.data() as Account;
    if (a.parentId === ACCOUNT_CODES.CLIENT_FUNDS_PAYABLE) clientCashKobo += a.cachedBalanceKobo;
    else if (a.parentId === ACCOUNT_CODES.CLIENT_HOLDINGS) clientHoldingsKobo += a.cachedBalanceKobo;
    if (a.code === ACCOUNT_CODES.HOUSE_BANK_PAYSTACK || a.code === ACCOUNT_CODES.HOUSE_BANK_OPERATING) {
      bankKobo += a.cachedBalanceKobo;
    }
  });

  const recent: RecentEntry[] = recentSnap.docs.map((d) => {
    const e = d.data();
    return {
      id: d.id,
      type: e.type as EntryType,
      totalKobo: (e.totalDebitKobo as number) ?? 0,
      postedDate: (e.postedDate as string) ?? "",
      createdByRole: (e.createdByRole as string) ?? "",
    };
  });

  return {
    clientCashKobo,
    clientHoldingsKobo,
    aumKobo: clientCashKobo + clientHoldingsKobo,
    bankKobo,
    clientCount: clients.data().count,
    pendingKyc: kyc.data().count,
    pendingWithdrawals: withdrawals.data().count,
    activeProducts: products.data().count,
    trialBalanced: trial.balanced,
    recent,
  };
}
