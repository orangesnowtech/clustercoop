import "./setup";
import { beforeEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import { seedChart, ensureClientAccounts } from "@/lib/ledger/accounts";
import { postEntry } from "@/lib/ledger/post";
import { ACCOUNT_CODES, clientSubAccountId } from "@/lib/ledger/chart";
import { getClientStatement } from "@/lib/statements/statement";
import { renderStatementPdf } from "@/lib/statements/pdf";
import { canViewClient, listClientsForStaff } from "@/lib/clients/access";

const UID = "client1";

async function deposit(amountKobo: number, date: string) {
  await postEntry({
    type: "deposit",
    reference: { source: "test", id: `dep_${date}` },
    postedDate: date,
    createdBy: "t", createdByRole: "system",
    lines: [
      { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, debitKobo: amountKobo },
      { accountId: clientSubAccountId(UID), creditKobo: amountKobo },
    ],
  });
}
async function withdraw(amountKobo: number, date: string) {
  await postEntry({
    type: "withdrawal",
    reference: { source: "test", id: `wd_${date}` },
    postedDate: date,
    createdBy: "t", createdByRole: "system",
    lines: [
      { accountId: clientSubAccountId(UID), debitKobo: amountKobo },
      { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, creditKobo: amountKobo },
    ],
  });
}

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
});

describe("getClientStatement", () => {
  it("returns enriched, ordered rows + correct summary", async () => {
    await deposit(50_000, "2026-06-26");
    await withdraw(20_000, "2026-06-27");

    const { rows, summary } = await getClientStatement(UID);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ type: "deposit", inflowKobo: 50_000, runningBalanceKobo: 50_000 });
    expect(rows[1]).toMatchObject({ type: "withdrawal", outflowKobo: 20_000, runningBalanceKobo: 30_000 });
    expect(summary).toEqual({ balanceKobo: 30_000, totalInKobo: 50_000, totalOutKobo: 20_000, count: 2 });
  });
});

describe("renderStatementPdf", () => {
  it("produces a non-empty PDF", async () => {
    await deposit(50_000, "2026-06-26");
    const { rows, summary } = await getClientStatement(UID);
    const pdf = await renderStatementPdf({
      client: { uid: UID, email: "c@test.dev" },
      rows, summary, generatedOn: "2026-06-27",
    });
    expect(pdf.length).toBeGreaterThan(500);
    // PDF magic bytes "%PDF"
    expect([pdf[0], pdf[1], pdf[2], pdf[3]]).toEqual([0x25, 0x50, 0x44, 0x46]);
  });
});

describe("canViewClient / listClientsForStaff (RM scoping)", () => {
  beforeEach(async () => {
    const db = getAdminDb();
    await db.collection("clients").doc(UID).set({ uid: UID, email: "c@test.dev", rmUid: "rmA", kycStatus: "pending" });
    await db.collection("clients").doc("client2").set({ uid: "client2", email: "c2@test.dev", rmUid: "rmB", kycStatus: "pending" });
  });

  const su = (uid: string, role: string) => ({ uid, email: null, role: role as never });

  it("self can view own", async () => {
    expect(await canViewClient(su(UID, "customer"), UID)).toBe(true);
  });
  it("a customer cannot view another", async () => {
    expect(await canViewClient(su("other", "customer"), UID)).toBe(false);
  });
  it("accounts can view any", async () => {
    expect(await canViewClient(su("acc", "accounts"), UID)).toBe(true);
  });
  it("rm can view assigned, not unassigned", async () => {
    expect(await canViewClient(su("rmA", "rm"), UID)).toBe(true);
    expect(await canViewClient(su("rmB", "rm"), UID)).toBe(false);
  });
  it("listClientsForStaff filters for rm, all for admin", async () => {
    const forRmA = await listClientsForStaff(su("rmA", "rm"));
    expect(forRmA.map((c) => c.uid)).toEqual([UID]);
    const forAdmin = await listClientsForStaff(su("admin", "admin"));
    expect(forAdmin.length).toBeGreaterThanOrEqual(2);
  });
});
