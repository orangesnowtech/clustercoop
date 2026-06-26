import { describe, it, expect } from "vitest";
import { buildDepositLines } from "./lines";
import { sumKobo } from "@/lib/money";

const UID = "user1";
const SUB = `2000:${UID}`;

function totals(lines: ReturnType<typeof buildDepositLines>) {
  return {
    debit: sumKobo(lines.map((l) => l.debitKobo ?? 0)),
    credit: sumKobo(lines.map((l) => l.creditKobo ?? 0)),
  };
}

describe("buildDepositLines — client_bears (default)", () => {
  it("credits the client NET and stays balanced", () => {
    const lines = buildDepositLines(5_000_000, 75_000, UID, "client_bears");
    expect(lines).toEqual([
      { accountId: "1000", debitKobo: 4_925_000 },
      { accountId: SUB, creditKobo: 4_925_000 },
    ]);
    const t = totals(lines);
    expect(t.debit).toBe(t.credit);
  });

  it("handles a zero fee", () => {
    const lines = buildDepositLines(5_000_000, 0, UID, "client_bears");
    const t = totals(lines);
    expect(t.debit).toBe(5_000_000);
    expect(t.debit).toBe(t.credit);
  });
});

describe("buildDepositLines — house_absorbs", () => {
  it("credits the client GROSS, books the fee, stays balanced", () => {
    const lines = buildDepositLines(5_000_000, 75_000, UID, "house_absorbs");
    expect(lines).toEqual([
      { accountId: "1000", debitKobo: 4_925_000 },
      { accountId: "5000", debitKobo: 75_000 },
      { accountId: SUB, creditKobo: 5_000_000 },
    ]);
    const t = totals(lines);
    expect(t.debit).toBe(t.credit);
  });

  it("with zero fee becomes a 2-line entry", () => {
    const lines = buildDepositLines(5_000_000, 0, UID, "house_absorbs");
    expect(lines).toHaveLength(2);
    const t = totals(lines);
    expect(t.debit).toBe(t.credit);
  });
});

describe("buildDepositLines — validation", () => {
  it("rejects fee > gross", () => {
    expect(() => buildDepositLines(100, 200, UID, "client_bears")).toThrow();
  });
  it("rejects non-integer kobo", () => {
    expect(() => buildDepositLines(100.5, 0, UID, "client_bears")).toThrow();
  });
  it("rejects non-positive gross", () => {
    expect(() => buildDepositLines(0, 0, UID, "client_bears")).toThrow();
  });
  it("rejects negative fee", () => {
    expect(() => buildDepositLines(100, -1, UID, "client_bears")).toThrow();
  });
});
