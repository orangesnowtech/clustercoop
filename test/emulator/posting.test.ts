import "./setup";
import { beforeEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import {
  seedChart,
  ensureClientAccounts,
  getAccount,
  COLLECTIONS,
} from "@/lib/ledger/accounts";
import { postEntry } from "@/lib/ledger/post";
import { getTrialBalance } from "@/lib/ledger/trialBalance";
import { verifyLedger } from "@/lib/ledger/verify";
import { clientSubAccountId } from "@/lib/ledger/chart";

const UID = "user1";
const SUB = clientSubAccountId(UID);

function deposit(amount: number, key?: string) {
  return postEntry({
    idempotencyKey: key,
    type: "deposit",
    reference: { source: "test", id: "dep1" },
    memo: "test deposit",
    postedDate: "2026-06-26",
    createdBy: "tester",
    createdByRole: "accounts",
    lines: [
      { accountId: "1000", debitKobo: amount },
      { accountId: SUB, creditKobo: amount },
    ],
  });
}

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
});

describe("postEntry", () => {
  it("posts a balanced deposit and moves both account balances", async () => {
    const { entryId } = await deposit(5_000_000);
    expect(entryId).toBeTruthy();

    const bank = await getAccount("1000");
    const sub = await getAccount(SUB);
    expect(bank!.cachedBalanceKobo).toBe(5_000_000); // asset, debit-normal
    expect(sub!.cachedBalanceKobo).toBe(5_000_000); // liability, credit-normal

    const tb = await getTrialBalance();
    expect(tb.balanced).toBe(true);
    expect(tb.totalDebitKobo).toBe(tb.totalCreditKobo);

    const v = await verifyLedger();
    expect(v.cacheConsistent).toBe(true);
    expect(v.lineSumsBalanced).toBe(true);
  });

  it("rejects an unbalanced entry", async () => {
    await expect(
      postEntry({
        type: "manual",
        reference: { source: "test", id: "x" },
        postedDate: "2026-06-26",
        createdBy: "t",
        createdByRole: "accounts",
        lines: [
          { accountId: "1000", debitKobo: 100 },
          { accountId: SUB, creditKobo: 90 },
        ],
      }),
    ).rejects.toThrowError(/unbalanced/i);
  });

  it("refuses to post to a control account", async () => {
    await expect(
      postEntry({
        type: "manual",
        reference: { source: "test", id: "x" },
        postedDate: "2026-06-26",
        createdBy: "t",
        createdByRole: "accounts",
        lines: [
          { accountId: "1000", debitKobo: 100 },
          { accountId: "2000", creditKobo: 100 }, // control account
        ],
      }),
    ).rejects.toThrowError(/control account/i);
  });

  it("is atomic: a bad account writes nothing", async () => {
    await expect(
      postEntry({
        type: "manual",
        reference: { source: "test", id: "x" },
        postedDate: "2026-06-26",
        createdBy: "t",
        createdByRole: "accounts",
        lines: [
          { accountId: "1000", debitKobo: 100 },
          { accountId: "9999", creditKobo: 100 }, // does not exist
        ],
      }),
    ).rejects.toThrowError(/does not exist/i);

    const entries = await getAdminDb().collection(COLLECTIONS.journalEntries).get();
    expect(entries.size).toBe(0); // nothing partially written
    const bank = await getAccount("1000");
    expect(bank!.cachedBalanceKobo).toBe(0);
  });

  it("is idempotent: same key posts once", async () => {
    const first = await deposit(5_000_000, "paystack:ref123");
    const second = await deposit(5_000_000, "paystack:ref123");
    expect(second.idempotentReplay).toBe(true);
    expect(second.entryId).toBe(first.entryId);

    const bank = await getAccount("1000");
    expect(bank!.cachedBalanceKobo).toBe(5_000_000); // only moved once
  });
});
