import { describe, it, expect } from "vitest";
import { applyRateBps } from "./rate";

describe("applyRateBps", () => {
  it("computes a positive gain", () => {
    expect(applyRateBps(1_000_000, 800)).toBe(80_000); // +8%
  });
  it("computes a loss", () => {
    expect(applyRateBps(1_000_000, -300)).toBe(-30_000); // -3%
  });
  it("rounds half-up on the magnitude", () => {
    expect(applyRateBps(1250, 100)).toBe(13); // 12.5 → 13
    expect(applyRateBps(1240, 100)).toBe(12); // 12.4 → 12
  });
  it("is zero for a zero balance or zero rate", () => {
    expect(applyRateBps(0, 800)).toBe(0);
    expect(applyRateBps(1_000_000, 0)).toBe(0);
  });
  it("rejects non-integer inputs", () => {
    expect(() => applyRateBps(100.5, 800)).toThrow();
    expect(() => applyRateBps(1000, 8.5)).toThrow();
  });
});
