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
import { reverseEntry } from "@/lib/ledger/reverse";
import { verifyLedger } from "@/lib/ledger/verify";
import { clientSubAccountId } from "@/lib/ledger/chart";
import type { JournalEntry } from "@/lib/ledger/types";

const UID = "user1";
const SUB = clientSubAccountId(UID);

async function postDeposit() {
  return postEntry({
    type: "deposit",
    reference: { source: "test", id: "dep" },
    postedDate: "2026-06-26",
    createdBy: "tester",
    createdByRole: "accounts",
    lines: [
      { accountId: "1000", debitKobo: 3_000_000 },
      { accountId: SUB, creditKobo: 3_000_000 },
    ],
  });
}

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
});

describe("reverseEntry", () => {
  it("reverses a posting and returns balances to zero", async () => {
    const { entryId } = await postDeposit();
    const { entryId: reversalId } = await reverseEntry({
      entryId,
      reason: "test reversal",
      reversalDate: "2026-06-27",
      createdBy: "tester",
      createdByRole: "accounts",
    });

    const bank = await getAccount("1000");
    const sub = await getAccount(SUB);
    expect(bank!.cachedBalanceKobo).toBe(0);
    expect(sub!.cachedBalanceKobo).toBe(0);

    const db = getAdminDb();
    const orig = (
      await db.collection(COLLECTIONS.journalEntries).doc(entryId).get()
    ).data() as JournalEntry;
    expect(orig.status).toBe("reversed");
    expect(orig.reversedBy).toBe(reversalId);

    const rev = (
      await db.collection(COLLECTIONS.journalEntries).doc(reversalId).get()
    ).data() as JournalEntry;
    expect(rev.status).toBe("reversal");
    expect(rev.reversalOf).toBe(entryId);

    const v = await verifyLedger();
    expect(v.cacheConsistent).toBe(true);
    expect(v.lineSumsBalanced).toBe(true);
  });

  it("does not edit the original entry's lines", async () => {
    const { entryId } = await postDeposit();
    await reverseEntry({
      entryId,
      reason: "r",
      reversalDate: "2026-06-27",
      createdBy: "t",
      createdByRole: "accounts",
    });
    const line0 = (
      await getAdminDb().collection(COLLECTIONS.journalLines).doc(`${entryId}_0`).get()
    ).data()!;
    expect(line0.debitKobo).toBe(3_000_000); // unchanged
    expect(line0.creditKobo).toBe(0);
  });

  it("blocks double-reversal", async () => {
    const { entryId } = await postDeposit();
    await reverseEntry({
      entryId,
      reason: "r",
      reversalDate: "2026-06-27",
      createdBy: "t",
      createdByRole: "accounts",
    });
    await expect(
      reverseEntry({
        entryId,
        reason: "again",
        reversalDate: "2026-06-28",
        createdBy: "t",
        createdByRole: "accounts",
      }),
    ).rejects.toThrowError(/cannot be reversed/i);
  });
});
