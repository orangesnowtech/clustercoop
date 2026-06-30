import "./setup";
import { beforeEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import { seedChart, ensureClientAccounts, COLLECTIONS } from "@/lib/ledger/accounts";
import { postEntry } from "@/lib/ledger/post";
import { getClientLedger } from "@/lib/ledger/statements";
import { ACCOUNT_CODES, clientSubAccountId } from "@/lib/ledger/chart";
import { FieldValue } from "firebase-admin/firestore";
import { createWithdrawalRequest } from "@/lib/withdrawals/request";
import {
  approveWithdrawal,
  rejectWithdrawal,
  cancelWithdrawal,
} from "@/lib/withdrawals/review";
import { postWithdrawal } from "@/lib/withdrawals/post";
import { WITHDRAWALS_COLLECTION } from "@/lib/withdrawals/queries";

const UID = "user1";
const ACCOUNTANT = { uid: "acct1", role: "accounts" as const };
const DEST = { bankName: "Test Bank", accountNumber: "0123456789", accountName: "Test User" };

/** Credit the client by posting DR 1000 / CR 2000:uid. */
async function creditClient(amountKobo: number) {
  await postEntry({
    type: "deposit",
    reference: { source: "test", id: `seed_${amountKobo}_${Math.round(amountKobo)}` },
    postedDate: "2026-06-27",
    createdBy: "test",
    createdByRole: "system",
    lines: [
      { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, debitKobo: amountKobo },
      { accountId: clientSubAccountId(UID), creditKobo: amountKobo },
    ],
  });
}

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
  // Withdrawals pay to the verified bank on the client profile.
  await getAdminDb().collection("clients").doc(UID).set({ uid: UID, profile: { bank: DEST } });
});

describe("withdrawal lifecycle", () => {
  it("request → approve → post debits the balance exactly once", async () => {
    await creditClient(100_000);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 40_000 });
    await approveWithdrawal(id, "comp1");
    const r = await postWithdrawal(id, ACCOUNTANT);

    expect((await getClientLedger(UID)).balanceKobo).toBe(60_000);
    const doc = (await getAdminDb().collection(WITHDRAWALS_COLLECTION).doc(id).get()).data()!;
    expect(doc.status).toBe("posted");
    expect(doc.entryId).toBe(r.entryId);

    const entries = await getAdminDb()
      .collection(COLLECTIONS.journalEntries)
      .where("type", "==", "withdrawal")
      .get();
    expect(entries.size).toBe(1);
  });

  it("is idempotent: double-post credits once", async () => {
    await creditClient(100_000);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 40_000 });
    await approveWithdrawal(id, "comp1");
    const first = await postWithdrawal(id, ACCOUNTANT);
    const second = await postWithdrawal(id, ACCOUNTANT);
    expect(second.entryId).toBe(first.entryId);
    expect(second.replay).toBe(true);
    expect((await getClientLedger(UID)).balanceKobo).toBe(60_000);
  });
});

describe("overdraw prevention", () => {
  it("rejects a second request that exceeds available (multi-pending)", async () => {
    await creditClient(100_000);
    await createWithdrawalRequest({ uid: UID, amountKobo: 60_000 });
    await expect(
      createWithdrawalRequest({ uid: UID, amountKobo: 60_000 }),
    ).rejects.toThrow(/available balance/i);
  });

  it("rejects a request when balance is zero", async () => {
    await expect(
      createWithdrawalRequest({ uid: UID, amountKobo: 10_000 }),
    ).rejects.toThrow(/available balance/i);
  });

  it("authoritative post-time sufficiency: cannot post more than the live balance", async () => {
    await creditClient(50_000);
    // Force an approved withdrawal that exceeds the balance (bypassing request guards).
    const id = "wd_force";
    await getAdminDb().collection(WITHDRAWALS_COLLECTION).doc(id).set({
      id, uid: UID, clientId: UID, amountKobo: 80_000, destination: DEST,
      status: "approved", requestedBy: UID, availableAtRequestKobo: 80_000,
      reviewedBy: "comp1", rejectionReason: null, postedBy: null, entryId: null,
      createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
    });
    await expect(postWithdrawal(id, ACCOUNTANT)).rejects.toThrow(/insufficient/i);
    expect((await getClientLedger(UID)).balanceKobo).toBe(50_000); // untouched
  });
});

describe("state machine guards", () => {
  it("cannot post a requested (un-approved) withdrawal", async () => {
    await creditClient(100_000);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 40_000 });
    await expect(postWithdrawal(id, ACCOUNTANT)).rejects.toThrow(/approved/i);
  });

  it("reject posts nothing and leaves the balance untouched", async () => {
    await creditClient(100_000);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 40_000 });
    await rejectWithdrawal(id, "comp1", "Suspicious destination");
    const doc = (await getAdminDb().collection(WITHDRAWALS_COLLECTION).doc(id).get()).data()!;
    expect(doc.status).toBe("rejected");
    expect(doc.rejectionReason).toBe("Suspicious destination");
    expect((await getClientLedger(UID)).balanceKobo).toBe(100_000);
  });

  it("owner can cancel while requested; a non-owner cannot", async () => {
    await creditClient(100_000);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 40_000 });
    await expect(cancelWithdrawal(id, "intruder")).rejects.toThrow(/not your/i);
    await cancelWithdrawal(id, UID);
    const doc = (await getAdminDb().collection(WITHDRAWALS_COLLECTION).doc(id).get()).data()!;
    expect(doc.status).toBe("cancelled");
  });

  it("cancelling frees the reservation (available rises again)", async () => {
    await creditClient(100_000);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 100_000 });
    // Available is now 0; a new request fails...
    await expect(
      createWithdrawalRequest({ uid: UID, amountKobo: 10_000 }),
    ).rejects.toThrow();
    await cancelWithdrawal(id, UID);
    // ...and succeeds after cancelling.
    const { id: id2 } = await createWithdrawalRequest({ uid: UID, amountKobo: 10_000 });
    expect(id2).toBeTruthy();
  });
});

describe("postEntry preconditions", () => {
  it("throws insufficient_funds when a precondition is unmet", async () => {
    await creditClient(10_000);
    await expect(
      postEntry({
        type: "withdrawal",
        reference: { source: "test", id: "pre1" },
        postedDate: "2026-06-27",
        createdBy: "t", createdByRole: "system",
        lines: [
          { accountId: clientSubAccountId(UID), debitKobo: 20_000 },
          { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, creditKobo: 20_000 },
        ],
        preconditions: [{ accountId: clientSubAccountId(UID), minBalanceKobo: 20_000 }],
      }),
    ).rejects.toThrow(/insufficient/i);
  });
});
