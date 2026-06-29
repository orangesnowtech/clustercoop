import { describe, it, expect } from "vitest";
import { canReviewTransition } from "./types";

describe("canReviewTransition", () => {
  it("compliance approves/rejects from in_review", () => {
    expect(canReviewTransition("approve", "in_review", "compliance")).toBe(true);
    expect(canReviewTransition("reject", "in_review", "compliance")).toBe(true);
  });
  it("admin/superadmin are break-glass", () => {
    expect(canReviewTransition("approve", "in_review", "admin")).toBe(true);
    expect(canReviewTransition("approve", "in_review", "superadmin")).toBe(true);
  });
  it("customer/accounts/rm cannot decide KYC", () => {
    for (const r of ["customer", "accounts", "rm"] as const) {
      expect(canReviewTransition("approve", "in_review", r)).toBe(false);
    }
  });
  it("cannot decide from a non-in_review status (no regression / no skipping)", () => {
    expect(canReviewTransition("approve", "pending", "compliance")).toBe(false);
    expect(canReviewTransition("approve", "approved", "compliance")).toBe(false);
    expect(canReviewTransition("reject", "rejected", "compliance")).toBe(false);
  });
});
