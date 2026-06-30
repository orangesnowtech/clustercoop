import "./setup";
import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { getAdminDb } from "@/lib/firebase/admin";
import { startKycSession, KYC_SESSIONS_COLLECTION } from "@/lib/kyc/session";
import { recordKycWebhook } from "@/lib/kyc/record";
import { approveKyc, rejectKyc } from "@/lib/kyc/review";
import { getClientKyc } from "@/lib/kyc/queries";
import { assertCanWithdraw } from "@/lib/kyc/gate";
import { assertCanDeposit } from "@/lib/deposits/pending";

const UID = "kc_user1";
const completed = (nonce: string | null, verdict = "verified") => ({
  nonce,
  eventName: "verification_completed",
  verdict: verdict as "verified" | "rejected" | "reviewNeeded",
  verificationId: "ver_123",
  resource: "https://api.getmati.com/v1/verifications/ver_123",
});

beforeEach(async () => {
  await clearEmulator();
});

describe("recordKycWebhook", () => {
  it("advances pending → in_review and consumes the session", async () => {
    const { nonce } = await startKycSession(UID);
    const r = await recordKycWebhook(completed(nonce));
    expect(r.applied).toBe(true);

    const kyc = await getClientKyc(UID);
    expect(kyc.kycStatus).toBe("in_review");
    expect(kyc.metamapVerdict).toBe("verified");

    const session = (await getAdminDb().collection(KYC_SESSIONS_COLLECTION).doc(nonce).get()).data()!;
    expect(session.used).toBe(true);
  });

  it("binds only to the session's own uid (cannot target another user)", async () => {
    const { nonce } = await startKycSession("kc_userA");
    await recordKycWebhook(completed(nonce));
    expect((await getClientKyc("kc_userA")).kycStatus).toBe("in_review");
    expect((await getClientKyc("kc_userB")).kycStatus).toBe("pending"); // untouched
  });

  it("ignores non-terminal events and unknown nonces", async () => {
    expect((await recordKycWebhook({ nonce: "x", eventName: "verification_started", verdict: null, verificationId: null, resource: null })).applied).toBe(false);
    expect((await recordKycWebhook(completed("no-such-nonce"))).applied).toBe(false);
  });

  it("is idempotent and never regresses an approved client", async () => {
    const { nonce } = await startKycSession(UID);
    await recordKycWebhook(completed(nonce));
    await approveKyc(UID, "comp1");
    // A late/duplicate webhook must not flip approved back to in_review.
    const r = await recordKycWebhook(completed(nonce));
    expect(r.applied).toBe(false);
    expect((await getClientKyc(UID)).kycStatus).toBe("approved");
  });
});

describe("review", () => {
  it("approve sets approved + reviewedBy; reject needs a reason", async () => {
    const { nonce } = await startKycSession(UID);
    await recordKycWebhook(completed(nonce));
    await approveKyc(UID, "comp1");
    const kyc = await getClientKyc(UID);
    expect(kyc.kycStatus).toBe("approved");
    expect(kyc.reviewedBy).toBe("comp1");

    const { nonce: n2 } = await startKycSession("kc_user2");
    await recordKycWebhook({ ...completed(n2), nonce: n2 });
    await expect(rejectKyc("kc_user2", "comp1", "")).rejects.toThrow(/reason/i);
    await rejectKyc("kc_user2", "comp1", "Document mismatch");
    expect((await getClientKyc("kc_user2")).kycStatus).toBe("rejected");
  });

  it("cannot approve a client who never verified (not in_review)", async () => {
    await getAdminDb().collection("clients").doc(UID).set({ uid: UID, kycStatus: "pending" });
    await expect(approveKyc(UID, "comp1")).rejects.toThrow(/in_review/i);
  });
});

describe("KYC gates", () => {
  beforeEach(() => {
    process.env.DEPOSITS_REQUIRE_KYC = "true";
    process.env.WITHDRAWALS_REQUIRE_KYC = "true";
  });
  afterEach(() => {
    delete process.env.DEPOSITS_REQUIRE_KYC;
    delete process.env.WITHDRAWALS_REQUIRE_KYC;
  });

  it("block deposit + withdraw until approved, then allow", async () => {
    await getAdminDb().collection("clients").doc(UID).set({ uid: UID, kycStatus: "pending" });
    await expect(assertCanDeposit(UID)).rejects.toThrow(/KYC/i);
    await expect(assertCanWithdraw(UID)).rejects.toThrow(/verification/i);

    await getAdminDb().collection("clients").doc(UID).set({ kycStatus: "approved" }, { merge: true });
    await expect(assertCanDeposit(UID)).resolves.toBeUndefined();
    await expect(assertCanWithdraw(UID)).resolves.toBeUndefined();
  });
});
