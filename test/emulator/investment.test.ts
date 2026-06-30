import "./setup";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import { seedChart, ensureClientAccounts, getAccount } from "@/lib/ledger/accounts";
import { postEntry } from "@/lib/ledger/post";
import { ACCOUNT_CODES, clientSubAccountId, holdingSubAccountId } from "@/lib/ledger/chart";
import { createProduct } from "@/lib/products/products";
import { allocate, redeem } from "@/lib/investments/allocate";
import { runValuation } from "@/lib/investments/valuation";
import { getClientHoldings } from "@/lib/investments/holdings";

const UID = "inv_user1";
const ACTOR = { uid: "acct1", role: "accounts" as const };

async function creditCash(amountKobo: number) {
  await postEntry({
    type: "deposit",
    reference: { source: "test", id: `seed_${amountKobo}` },
    postedDate: "2026-06-30",
    createdBy: "t", createdByRole: "system",
    lines: [
      { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, debitKobo: amountKobo },
      { accountId: clientSubAccountId(UID), creditKobo: amountKobo },
    ],
  });
}
const cash = async () => (await getAccount(clientSubAccountId(UID)))!.cachedBalanceKobo;
const holding = async (pid: string) =>
  (await getAccount(holdingSubAccountId(UID, pid)))!.cachedBalanceKobo;

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
});

describe("allocate / redeem", () => {
  it("moves cash into a holding and back", async () => {
    await creditCash(100_000);
    const { id: pid } = await createProduct({ name: "Growth Fund", createdBy: ACTOR.uid });

    await allocate({ uid: UID, productId: pid, amountKobo: 60_000, actor: ACTOR });
    expect(await cash()).toBe(40_000);
    expect(await holding(pid)).toBe(60_000);

    const holdings = await getClientHoldings(UID);
    expect(holdings[0]).toMatchObject({ productId: pid, costBasisKobo: 60_000, currentValueKobo: 60_000 });

    await redeem({ uid: UID, productId: pid, amountKobo: 20_000, actor: ACTOR });
    expect(await cash()).toBe(60_000);
    expect(await holding(pid)).toBe(40_000);
  });

  it("cannot invest more cash than held (precondition)", async () => {
    await creditCash(30_000);
    const { id: pid } = await createProduct({ name: "Fund", createdBy: ACTOR.uid });
    await expect(
      allocate({ uid: UID, productId: pid, amountKobo: 50_000, actor: ACTOR }),
    ).rejects.toThrow(/insufficient/i);
    expect(await cash()).toBe(30_000);
  });

  it("cannot redeem more than held", async () => {
    await creditCash(50_000);
    const { id: pid } = await createProduct({ name: "Fund", createdBy: ACTOR.uid });
    await allocate({ uid: UID, productId: pid, amountKobo: 50_000, actor: ACTOR });
    await expect(
      redeem({ uid: UID, productId: pid, amountKobo: 80_000, actor: ACTOR }),
    ).rejects.toThrow(/insufficient/i);
  });

  it("cannot invest in a closed product", async () => {
    await creditCash(50_000);
    const { id: pid } = await createProduct({ name: "Fund", createdBy: ACTOR.uid });
    await getAdminDb().collection("products").doc(pid).update({ status: "closed" });
    await expect(
      allocate({ uid: UID, productId: pid, amountKobo: 10_000, actor: ACTOR }),
    ).rejects.toThrow(/not open/i);
  });
});

describe("valuation runs", () => {
  it("product basis: each holder gains the % (and a loss reduces it)", async () => {
    await creditCash(100_000);
    const { id: pid } = await createProduct({ name: "Growth", createdBy: ACTOR.uid });
    await allocate({ uid: UID, productId: pid, amountKobo: 40_000, actor: ACTOR });

    const gain = await runValuation({ basis: { type: "product", productId: pid }, rateBps: 1000, actor: ACTOR }); // +10%
    expect(gain.clientCount).toBe(1);
    expect(await holding(pid)).toBe(44_000);

    await runValuation({ basis: { type: "product", productId: pid }, rateBps: -500, actor: ACTOR }); // -5% of 44,000 = -2,200
    expect(await holding(pid)).toBe(41_800);

    const holdings = await getClientHoldings(UID);
    expect(holdings[0].currentValueKobo).toBe(41_800); // projection refreshed
  });

  it("cash basis: each client's cash gains the %", async () => {
    await creditCash(100_000);
    await runValuation({ basis: { type: "cash" }, rateBps: 500, actor: ACTOR }); // +5%
    expect(await cash()).toBe(105_000);
  });

  it("rejects a zero rate", async () => {
    await expect(
      runValuation({ basis: { type: "cash" }, rateBps: 0, actor: ACTOR }),
    ).rejects.toThrow(/non-zero/i);
  });
});

describe("KYC gate on allocation", () => {
  beforeEach(() => {
    process.env.INVESTMENTS_REQUIRE_KYC = "true";
  });
  afterEach(() => {
    delete process.env.INVESTMENTS_REQUIRE_KYC;
  });

  it("blocks allocation until KYC approved", async () => {
    await creditCash(50_000);
    const { id: pid } = await createProduct({ name: "Fund", createdBy: ACTOR.uid });
    await getAdminDb().collection("clients").doc(UID).set({ uid: UID, kycStatus: "pending" });
    await expect(
      allocate({ uid: UID, productId: pid, amountKobo: 10_000, actor: ACTOR }),
    ).rejects.toThrow(/verification/i);

    await getAdminDb().collection("clients").doc(UID).set({ kycStatus: "approved" }, { merge: true });
    await allocate({ uid: UID, productId: pid, amountKobo: 10_000, actor: ACTOR });
    expect(await holding(pid)).toBe(10_000);
  });
});
