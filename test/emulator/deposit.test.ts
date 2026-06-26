import "./setup";
import { beforeEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import { seedChart, ensureClientAccounts, COLLECTIONS } from "@/lib/ledger/accounts";
import { getClientLedger } from "@/lib/ledger/statements";
import { createPendingDeposit, DEPOSITS_COLLECTION } from "@/lib/deposits/pending";
import { recordVerifiedDeposit } from "@/lib/deposits/record";
import type { PaystackVerifyResult } from "@/lib/api/paystack";

const UID = "user1";

function fakeVerify(over: Partial<PaystackVerifyResult> = {}) {
  return async (reference: string): Promise<PaystackVerifyResult> => ({
    status: "success",
    reference,
    amountKobo: 5_000_000,
    feeKobo: 75_000,
    paidAt: "2026-06-26T10:00:00.000Z",
    channel: "card",
    ...over,
  });
}

async function pending(intendedKobo = 5_000_000) {
  const { reference } = await createPendingDeposit({
    uid: UID,
    intendedKobo,
    email: "u@test.dev",
    policy: "client_bears",
  });
  return reference;
}

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
});

describe("recordVerifiedDeposit", () => {
  it("posts once and credits the client NET (client_bears)", async () => {
    const ref = await pending();
    const r = await recordVerifiedDeposit(ref, { verify: fakeVerify() });
    expect(r.status).toBe("success");

    const { balanceKobo } = await getClientLedger(UID);
    expect(balanceKobo).toBe(4_925_000); // gross 5,000,000 − fee 75,000

    const dep = (
      await getAdminDb().collection(DEPOSITS_COLLECTION).doc(ref).get()
    ).data()!;
    expect(dep.status).toBe("success");
    expect(dep.entryId).toBe(r.entryId);
    expect(dep.creditedKobo).toBe(4_925_000);
  });

  it("is idempotent: two paths for one reference credit once", async () => {
    const ref = await pending();
    const first = await recordVerifiedDeposit(ref, { verify: fakeVerify(), completedVia: "callback" });
    const second = await recordVerifiedDeposit(ref, { verify: fakeVerify(), completedVia: "webhook" });

    expect(second.entryId).toBe(first.entryId);
    expect(second.replay).toBe(true);

    const { balanceKobo } = await getClientLedger(UID);
    expect(balanceKobo).toBe(4_925_000); // credited only once

    const entries = await getAdminDb()
      .collection(COLLECTIONS.journalEntries)
      .where("type", "==", "deposit")
      .get();
    expect(entries.size).toBe(1);
  });

  it("marks failed and posts nothing when Paystack says failed", async () => {
    const ref = await pending();
    const r = await recordVerifiedDeposit(ref, {
      verify: fakeVerify({ status: "failed" }),
    });
    expect(r.status).toBe("failed");

    const { balanceKobo } = await getClientLedger(UID);
    expect(balanceKobo).toBe(0);
    const dep = (
      await getAdminDb().collection(DEPOSITS_COLLECTION).doc(ref).get()
    ).data()!;
    expect(dep.status).toBe("failed");
  });

  it("rejects underpayment (verified amount < intended)", async () => {
    const ref = await pending(5_000_000);
    const r = await recordVerifiedDeposit(ref, {
      verify: fakeVerify({ amountKobo: 4_000_000 }),
    });
    expect(r.status).toBe("failed");
    expect(r.reason).toBe("amount_mismatch");
    const { balanceKobo } = await getClientLedger(UID);
    expect(balanceKobo).toBe(0);
  });

  it("rejects an unknown reference", async () => {
    const r = await recordVerifiedDeposit("dep_nope", { verify: fakeVerify() });
    expect(r.status).toBe("unknown");
  });

  it("converges the doc on retry after a simulated post-without-markSuccess", async () => {
    const ref = await pending();
    // Simulate: ledger entry exists but the deposit doc never got markSuccess
    // (crash between post and update). A retry must converge, not double-post.
    await recordVerifiedDeposit(ref, { verify: fakeVerify() });
    await getAdminDb().collection(DEPOSITS_COLLECTION).doc(ref).update({
      status: "pending",
      entryId: null,
    });

    const retry = await recordVerifiedDeposit(ref, { verify: fakeVerify() });
    expect(retry.replay).toBe(true); // ledger already had the entry
    const { balanceKobo } = await getClientLedger(UID);
    expect(balanceKobo).toBe(4_925_000); // still credited once
    const dep = (
      await getAdminDb().collection(DEPOSITS_COLLECTION).doc(ref).get()
    ).data()!;
    expect(dep.status).toBe("success"); // doc reconciled
  });
});
