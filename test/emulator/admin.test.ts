import "./setup";
import { beforeEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import { seedChart, ensureClientAccounts } from "@/lib/ledger/accounts";
import { postEntry } from "@/lib/ledger/post";
import { ACCOUNT_CODES, clientSubAccountId } from "@/lib/ledger/chart";
import { createProduct } from "@/lib/products/products";
import { allocate } from "@/lib/investments/allocate";
import { getAdminOverview } from "@/lib/admin/overview";

const A = "ov_a";
const B = "ov_b";

async function credit(uid: string, kobo: number) {
  await postEntry({
    type: "deposit",
    reference: { source: "test", id: `seed_${uid}` },
    postedDate: "2026-06-30",
    createdBy: "t", createdByRole: "system",
    lines: [
      { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, debitKobo: kobo },
      { accountId: clientSubAccountId(uid), creditKobo: kobo },
    ],
  });
}

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(A);
  await ensureClientAccounts(B);
});

describe("getAdminOverview", () => {
  it("aggregates AUM, cash, counts and trial-balance", async () => {
    await credit(A, 100_000);
    await credit(B, 50_000);

    const { id: pid } = await createProduct({ name: "Fund", createdBy: "acct" });
    await allocate({ uid: A, productId: pid, amountKobo: 40_000, actor: { uid: "acct", role: "accounts" } });

    const db = getAdminDb();
    await db.collection("clients").doc(A).set({ uid: A, kycStatus: "in_review" });
    await db.collection("clients").doc(B).set({ uid: B, kycStatus: "approved" });
    await db.collection("withdrawals").doc("w1").set({
      id: "w1", uid: B, clientId: B, amountKobo: 10_000, status: "requested", createdAt: new Date().toISOString(),
    });

    const o = await getAdminOverview();
    expect(o.clientCashKobo).toBe(110_000); // A 60k + B 50k
    expect(o.clientHoldingsKobo).toBe(40_000);
    expect(o.aumKobo).toBe(150_000);
    expect(o.bankKobo).toBe(150_000); // two deposits; allocate doesn't touch bank
    expect(o.clientCount).toBe(2);
    expect(o.pendingKyc).toBe(1);
    expect(o.pendingWithdrawals).toBe(1);
    expect(o.activeProducts).toBe(1);
    expect(o.trialBalanced).toBe(true);
    expect(o.recent.length).toBeGreaterThan(0);
  });
});
