import { describe, it, expect } from "vitest";
import { buildStatementRows, summarize } from "./rows";
import type { JournalLine, EntryType } from "@/lib/ledger/types";

// Helper: a client (2000:uid, credit-normal) line.
function line(over: Partial<JournalLine>): JournalLine {
  return {
    id: "l",
    entryId: "e",
    accountId: "2000:u",
    accountClass: "liability",
    normalBalance: "credit",
    clientId: "u",
    debitKobo: 0,
    creditKobo: 0,
    date: "2026-06-26",
    memo: "",
    ...over,
  };
}

describe("buildStatementRows", () => {
  it("labels deposit as inflow, withdrawal as outflow, with running balance", () => {
    const lines = [
      line({ entryId: "e1", creditKobo: 50_000, date: "2026-06-26" }),
      line({ entryId: "e2", debitKobo: 20_000, date: "2026-06-27" }),
    ];
    const types = new Map<string, EntryType>([
      ["e1", "deposit"],
      ["e2", "withdrawal"],
    ]);
    const rows = buildStatementRows(lines, types);

    expect(rows[0]).toMatchObject({
      type: "deposit",
      description: "Deposit",
      inflowKobo: 50_000,
      outflowKobo: 0,
      runningBalanceKobo: 50_000,
    });
    expect(rows[1]).toMatchObject({
      type: "withdrawal",
      description: "Withdrawal",
      inflowKobo: 0,
      outflowKobo: 20_000,
      runningBalanceKobo: 30_000,
    });
  });

  it("prefers a line memo over the type label", () => {
    const rows = buildStatementRows(
      [line({ entryId: "e1", creditKobo: 100, memo: "Bonus credit" })],
      new Map([["e1", "manual"]]),
    );
    expect(rows[0].description).toBe("Bonus credit");
  });

  it("falls back to 'unknown' when the entry is missing", () => {
    const rows = buildStatementRows([line({ creditKobo: 100 })], new Map());
    expect(rows[0].type).toBe("unknown");
  });
});

describe("summarize", () => {
  it("totals inflow/outflow and reports the final balance", () => {
    const rows = buildStatementRows(
      [
        line({ entryId: "e1", creditKobo: 50_000 }),
        line({ entryId: "e2", debitKobo: 20_000 }),
      ],
      new Map<string, EntryType>([["e1", "deposit"], ["e2", "withdrawal"]]),
    );
    expect(summarize(rows)).toEqual({
      balanceKobo: 30_000,
      totalInKobo: 50_000,
      totalOutKobo: 20_000,
      count: 2,
    });
  });

  it("handles an empty statement", () => {
    expect(summarize([])).toEqual({
      balanceKobo: 0,
      totalInKobo: 0,
      totalOutKobo: 0,
      count: 0,
    });
  });
});
