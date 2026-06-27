import { describe, it, expect } from "vitest";
import { decideClientAccess } from "./access";

describe("decideClientAccess", () => {
  it("anyone can view themselves", () => {
    expect(decideClientAccess("customer", true, false)).toBe(true);
    expect(decideClientAccess("rm", true, false)).toBe(true);
  });

  it("admin/accounts/compliance/superadmin can view any client", () => {
    for (const r of ["superadmin", "admin", "accounts", "compliance"] as const) {
      expect(decideClientAccess(r, false, false)).toBe(true);
    }
  });

  it("rm can view only assigned clients", () => {
    expect(decideClientAccess("rm", false, true)).toBe(true);
    expect(decideClientAccess("rm", false, false)).toBe(false);
  });

  it("a customer cannot view another customer", () => {
    expect(decideClientAccess("customer", false, false)).toBe(false);
  });

  it("no role, not self → denied", () => {
    expect(decideClientAccess(undefined, false, false)).toBe(false);
  });
});
