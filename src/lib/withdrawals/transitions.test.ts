import { describe, it, expect } from "vitest";
import { canTransition } from "./types";
import { buildWithdrawalLines } from "./lines";
import { sumKobo } from "@/lib/money";

describe("canTransition — separation of duties + order", () => {
  it("compliance approves a requested withdrawal", () => {
    expect(canTransition("approve", "requested", "compliance")).toBe(true);
  });
  it("accounts CANNOT approve", () => {
    expect(canTransition("approve", "requested", "accounts")).toBe(false);
  });
  it("accounts posts an approved withdrawal", () => {
    expect(canTransition("post", "approved", "accounts")).toBe(true);
  });
  it("compliance CANNOT post", () => {
    expect(canTransition("post", "approved", "compliance")).toBe(false);
  });
  it("cannot post a requested (un-approved) withdrawal — order enforced", () => {
    expect(canTransition("post", "requested", "accounts")).toBe(false);
  });
  it("admin is break-glass on both approve and post", () => {
    expect(canTransition("approve", "requested", "admin")).toBe(true);
    expect(canTransition("post", "approved", "admin")).toBe(true);
    expect(canTransition("approve", "requested", "superadmin")).toBe(true);
    expect(canTransition("post", "approved", "superadmin")).toBe(true);
  });
  it("only the customer cancels, and only while requested", () => {
    expect(canTransition("cancel", "requested", "customer")).toBe(true);
    expect(canTransition("cancel", "approved", "customer")).toBe(false);
    expect(canTransition("cancel", "requested", "accounts")).toBe(false);
  });
  it("reject only from requested, not from approved", () => {
    expect(canTransition("reject", "requested", "compliance")).toBe(true);
    expect(canTransition("reject", "approved", "compliance")).toBe(false);
  });
});

describe("buildWithdrawalLines", () => {
  it("debits the client sub-account and credits the bank, balanced", () => {
    const lines = buildWithdrawalLines(2_000_000, "u1");
    expect(lines).toEqual([
      { accountId: "2000:u1", debitKobo: 2_000_000 },
      { accountId: "1000", creditKobo: 2_000_000 },
    ]);
    const debit = sumKobo(lines.map((l) => l.debitKobo ?? 0));
    const credit = sumKobo(lines.map((l) => l.creditKobo ?? 0));
    expect(debit).toBe(credit);
  });
  it("rejects non-positive / non-integer amounts", () => {
    expect(() => buildWithdrawalLines(0, "u1")).toThrow();
    expect(() => buildWithdrawalLines(10.5, "u1")).toThrow();
  });
});
