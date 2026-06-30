import "./setup";
import { beforeEach, describe, it, expect } from "vitest";
import { clearEmulator } from "./setup";
import { seedChart, ensureClientAccounts } from "@/lib/ledger/accounts";
import { postEntry } from "@/lib/ledger/post";
import { ACCOUNT_CODES, clientSubAccountId } from "@/lib/ledger/chart";
import { saveOnboarding, isOnboarded, getVerifiedBank } from "@/lib/clients/profile";
import { createWithdrawalRequest } from "@/lib/withdrawals/request";

const UID = "ob_user1";
const PROFILE = {
  firstName: "Ada",
  middleName: "",
  lastName: "Obi",
  phone: "08031234567",
  address: "12 Marina, Lagos",
  nin: "12345678901",
  bvn: "22123456789",
  bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Ada Obi" },
};

beforeEach(async () => {
  await clearEmulator();
  await seedChart();
  await ensureClientAccounts(UID);
});

describe("onboarding profile", () => {
  it("saveOnboarding stores the profile + onboardedAt; getters reflect it", async () => {
    expect(await isOnboarded(UID)).toBe(false);
    await saveOnboarding(UID, PROFILE);
    expect(await isOnboarded(UID)).toBe(true);
    const bank = await getVerifiedBank(UID);
    expect(bank).toEqual(PROFILE.bank);
  });

  it("validation rejects a bad NIN", async () => {
    await expect(saveOnboarding(UID, { ...PROFILE, nin: "123" })).rejects.toThrow(/NIN/i);
  });
});

describe("withdrawal requires a verified bank", () => {
  it("rejects when no bank on file, succeeds after onboarding", async () => {
    await postEntry({
      type: "deposit",
      reference: { source: "test", id: "seed" },
      postedDate: "2026-06-30",
      createdBy: "t", createdByRole: "system",
      lines: [
        { accountId: ACCOUNT_CODES.HOUSE_BANK_PAYSTACK, debitKobo: 100_000 },
        { accountId: clientSubAccountId(UID), creditKobo: 100_000 },
      ],
    });

    await expect(
      createWithdrawalRequest({ uid: UID, amountKobo: 40_000 }),
    ).rejects.toThrow(/verified bank/i);

    await saveOnboarding(UID, PROFILE);
    const { id } = await createWithdrawalRequest({ uid: UID, amountKobo: 40_000 });
    expect(id).toBeTruthy();
  });
});
