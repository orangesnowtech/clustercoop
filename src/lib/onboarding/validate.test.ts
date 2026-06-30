import { describe, it, expect } from "vitest";
import { validateOnboarding, type ClientProfileInput } from "./validate";

const valid: ClientProfileInput = {
  firstName: "Ada",
  middleName: "Ngozi",
  lastName: "Obi",
  phone: "08031234567",
  address: "12 Marina Road, Lagos",
  nin: "12345678901",
  bvn: "22123456789",
  bank: { bankName: "GTBank", accountNumber: "0123456789", accountName: "Ada Obi" },
};

describe("validateOnboarding", () => {
  it("accepts a valid profile and normalizes digits", () => {
    const r = validateOnboarding({ ...valid, phone: "+234 803 123 4567" });
    expect(r.phone).toBe("2348031234567");
    expect(r.nin).toBe("12345678901");
    expect(r.bank.accountNumber).toBe("0123456789");
  });

  it("rejects a bad NIN (not 11 digits)", () => {
    expect(() => validateOnboarding({ ...valid, nin: "123" })).toThrowError(/NIN/i);
  });
  it("rejects a bad BVN", () => {
    expect(() => validateOnboarding({ ...valid, bvn: "1234567890" })).toThrowError(/BVN/i);
  });
  it("rejects an account number that isn't 10 digits", () => {
    expect(() =>
      validateOnboarding({ ...valid, bank: { ...valid.bank, accountNumber: "12345" } }),
    ).toThrowError(/account number/i);
  });
  it("rejects a too-short phone", () => {
    expect(() => validateOnboarding({ ...valid, phone: "12345" })).toThrowError(/phone/i);
  });
  it("rejects missing required names/address/bank fields", () => {
    expect(() => validateOnboarding({ ...valid, firstName: "" })).toThrow();
    expect(() => validateOnboarding({ ...valid, address: "  " })).toThrow();
    expect(() =>
      validateOnboarding({ ...valid, bank: { ...valid.bank, bankName: "" } }),
    ).toThrow();
  });
});
