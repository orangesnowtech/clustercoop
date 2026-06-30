import { describe, it, expect } from "vitest";
import { buildAllocationLines, buildRedemptionLines, buildValuationLines } from "./lines";
import { sumKobo } from "@/lib/money";

const balanced = (lines: { debitKobo?: number; creditKobo?: number }[]) =>
  sumKobo(lines.map((l) => l.debitKobo ?? 0)) === sumKobo(lines.map((l) => l.creditKobo ?? 0));

describe("buildAllocationLines", () => {
  it("DR client cash / CR client holding, balanced", () => {
    const lines = buildAllocationLines("u1", "p1", 50_000);
    expect(lines).toEqual([
      { accountId: "2000:u1", debitKobo: 50_000 },
      { accountId: "2300:u1:p1", creditKobo: 50_000 },
    ]);
    expect(balanced(lines)).toBe(true);
  });
  it("rejects non-positive amounts", () => {
    expect(() => buildAllocationLines("u1", "p1", 0)).toThrow();
  });
});

describe("buildRedemptionLines", () => {
  it("DR client holding / CR client cash, balanced", () => {
    const lines = buildRedemptionLines("u1", "p1", 20_000);
    expect(lines).toEqual([
      { accountId: "2300:u1:p1", debitKobo: 20_000 },
      { accountId: "2000:u1", creditKobo: 20_000 },
    ]);
    expect(balanced(lines)).toBe(true);
  });
});

describe("buildValuationLines", () => {
  it("gain: DR 5100 / CR target", () => {
    expect(buildValuationLines("2300:u1:p1", 4_000)).toEqual([
      { accountId: "5100", debitKobo: 4_000 },
      { accountId: "2300:u1:p1", creditKobo: 4_000 },
    ]);
  });
  it("loss: DR target / CR 5100", () => {
    expect(buildValuationLines("2300:u1:p1", -4_000)).toEqual([
      { accountId: "2300:u1:p1", debitKobo: 4_000 },
      { accountId: "5100", creditKobo: 4_000 },
    ]);
  });
  it("rejects a zero gain", () => {
    expect(() => buildValuationLines("2300:u1:p1", 0)).toThrow();
  });
});
