import { describe, it, expect } from "vitest";
import {
  computeAvailableKobo,
  validateWithdrawalRequest,
  MIN_WITHDRAWAL_KOBO,
} from "./available";

describe("computeAvailableKobo", () => {
  it("subtracts reserved (live) withdrawals from the ledger balance", () => {
    expect(computeAvailableKobo(100_000, [])).toBe(100_000);
    expect(
      computeAvailableKobo(100_000, [{ amountKobo: 30_000 }, { amountKobo: 20_000 }]),
    ).toBe(50_000);
  });
  it("can go to zero", () => {
    expect(computeAvailableKobo(50_000, [{ amountKobo: 50_000 }])).toBe(0);
  });
});

describe("validateWithdrawalRequest", () => {
  it("accepts an amount within available", () => {
    expect(validateWithdrawalRequest(40_000, 50_000).ok).toBe(true);
  });
  it("accepts exactly the available amount", () => {
    expect(validateWithdrawalRequest(50_000, 50_000).ok).toBe(true);
  });
  it("rejects more than available", () => {
    expect(validateWithdrawalRequest(60_000, 50_000).ok).toBe(false);
  });
  it("rejects zero and negative", () => {
    expect(validateWithdrawalRequest(0, 50_000).ok).toBe(false);
    expect(validateWithdrawalRequest(-100, 50_000).ok).toBe(false);
  });
  it("rejects non-integer kobo", () => {
    expect(validateWithdrawalRequest(100.5, 50_000).ok).toBe(false);
  });
  it("rejects below the minimum", () => {
    expect(validateWithdrawalRequest(MIN_WITHDRAWAL_KOBO - 1, 50_000).ok).toBe(false);
  });
});
