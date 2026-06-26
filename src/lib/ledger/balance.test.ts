import { describe, it, expect } from "vitest";
import {
  normalBalanceForClass,
  signedDelta,
  negateKobo,
  trialBalanceColumns,
} from "./balance";

describe("normalBalanceForClass", () => {
  it("asset and expense are debit-normal", () => {
    expect(normalBalanceForClass("asset")).toBe("debit");
    expect(normalBalanceForClass("expense")).toBe("debit");
  });
  it("liability, equity, income are credit-normal", () => {
    expect(normalBalanceForClass("liability")).toBe("credit");
    expect(normalBalanceForClass("equity")).toBe("credit");
    expect(normalBalanceForClass("income")).toBe("credit");
  });
});

describe("signedDelta", () => {
  it("debit-normal: +debit, -credit", () => {
    expect(signedDelta("debit", 500, 0)).toBe(500);
    expect(signedDelta("debit", 0, 500)).toBe(-500);
  });
  it("credit-normal: +credit, -debit", () => {
    expect(signedDelta("credit", 0, 500)).toBe(500);
    expect(signedDelta("credit", 500, 0)).toBe(-500);
  });
  it("rejects non-integer kobo", () => {
    expect(() => signedDelta("debit", 1.5, 0)).toThrow();
  });
});

describe("negateKobo", () => {
  it("negates", () => {
    expect(negateKobo(500)).toBe(-500);
    expect(negateKobo(-500)).toBe(500);
  });
});

describe("trialBalanceColumns", () => {
  it("debit-normal positive shows in debit column", () => {
    expect(trialBalanceColumns("debit", 500)).toEqual({ debitKobo: 500, creditKobo: 0 });
  });
  it("credit-normal positive shows in credit column", () => {
    expect(trialBalanceColumns("credit", 500)).toEqual({ debitKobo: 0, creditKobo: 500 });
  });
  it("abnormal (negative) balance flips columns, never negative", () => {
    expect(trialBalanceColumns("debit", -500)).toEqual({ debitKobo: 0, creditKobo: 500 });
    expect(trialBalanceColumns("credit", -500)).toEqual({ debitKobo: 500, creditKobo: 0 });
  });
  it("zero shows zero on both", () => {
    expect(trialBalanceColumns("debit", 0)).toEqual({ debitKobo: 0, creditKobo: 0 });
  });
});
