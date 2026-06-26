import { describe, it, expect } from "vitest";
import { validateEntryLines, MAX_LINES } from "./validate";
import { LedgerError } from "./types";

const ok = [
  { accountId: "1000", debitKobo: 5000 },
  { accountId: "2000:u", creditKobo: 5000 },
];

describe("validateEntryLines", () => {
  it("accepts a balanced two-line entry and returns equal totals", () => {
    const r = validateEntryLines(ok);
    expect(r.totalDebitKobo).toBe(5000);
    expect(r.totalCreditKobo).toBe(5000);
    expect(r.lines).toHaveLength(2);
  });

  it("accepts a balanced multi-line entry (deposit with fee)", () => {
    const r = validateEntryLines([
      { accountId: "1000", debitKobo: 4925000 },
      { accountId: "5000", debitKobo: 75000 },
      { accountId: "2000:u", creditKobo: 5000000 },
    ]);
    expect(r.totalDebitKobo).toBe(5000000);
  });

  it("rejects fewer than two lines", () => {
    expect(() => validateEntryLines([{ accountId: "1000", debitKobo: 1 }])).toThrow(
      LedgerError,
    );
  });

  it("rejects an unbalanced entry", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "1000", debitKobo: 5000 },
        { accountId: "2000:u", creditKobo: 4000 },
      ]),
    ).toThrowError(/unbalanced/i);
  });

  it("rejects a line with both debit and credit", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "1000", debitKobo: 5000, creditKobo: 5000 },
        { accountId: "2000:u", creditKobo: 5000 },
      ]),
    ).toThrowError(/exactly one/i);
  });

  it("rejects a line with neither debit nor credit", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "1000" },
        { accountId: "2000:u", creditKobo: 0 },
      ]),
    ).toThrow(LedgerError);
  });

  it("rejects non-integer kobo", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "1000", debitKobo: 50.5 },
        { accountId: "2000:u", creditKobo: 50.5 },
      ]),
    ).toThrowError(/whole kobo/i);
  });

  it("rejects negative amounts", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "1000", debitKobo: -5000 },
        { accountId: "2000:u", creditKobo: -5000 },
      ]),
    ).toThrow(LedgerError);
  });

  it("rejects a zero-total balanced entry", () => {
    expect(() =>
      validateEntryLines([
        { accountId: "1000", debitKobo: 0 },
        { accountId: "2000:u", creditKobo: 0 },
      ]),
    ).toThrow(LedgerError);
  });

  it("rejects more than MAX_LINES", () => {
    const many = Array.from({ length: MAX_LINES + 1 }, (_, i) => ({
      accountId: `a${i}`,
      debitKobo: 1,
    }));
    expect(() => validateEntryLines(many)).toThrowError(/exceed/i);
  });
});
