"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nairaToKobo, formatKobo } from "@/lib/money";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}

interface Line {
  accountId: string;
  side: "debit" | "credit";
  amount: string; // naira, as typed
}

const blankLine: Line = { accountId: "", side: "debit", amount: "" };

export function NewEntryForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { ...blankLine, side: "debit" },
    { ...blankLine, side: "credit" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const { debitKobo, creditKobo, balanced } = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const l of lines) {
      const n = parseFloat(l.amount);
      if (!Number.isFinite(n) || n <= 0) continue;
      const k = nairaToKobo(n);
      if (l.side === "debit") d += k;
      else c += k;
    }
    return { debitKobo: d, creditKobo: c, balanced: d === c && d > 0 };
  }, [lines]);

  function update(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, { ...blankLine }]);
  }
  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    setError(null);
    setPending(true);
    const payload = {
      memo,
      lines: lines
        .filter((l) => l.accountId && parseFloat(l.amount) > 0)
        .map((l) => ({
          accountId: l.accountId,
          ...(l.side === "debit"
            ? { debitKobo: nairaToKobo(parseFloat(l.amount)) }
            : { creditKobo: nairaToKobo(parseFloat(l.amount)) }),
          memo: "",
        })),
    };
    const res = await fetch("/api/ledger/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Posting failed");
      setPending(false);
      return;
    }
    const { entryId } = await res.json();
    router.push(`/admin/ledger/${entryId}`);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">Memo</span>
        <input
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-primary"
          placeholder="What is this entry for?"
        />
      </label>

      <div className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <div key={i} className="flex items-center gap-2">
            <select
              value={line.accountId}
              onChange={(e) => update(i, { accountId: e.target.value })}
              className="flex-1 rounded-lg border border-border bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="">Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.code} · {a.name}
                </option>
              ))}
            </select>
            <select
              value={line.side}
              onChange={(e) => update(i, { side: e.target.value as Line["side"] })}
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-ink outline-none focus:border-primary"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              value={line.amount}
              onChange={(e) => update(i, { amount: e.target.value })}
              placeholder="₦0.00"
              className="w-32 rounded-lg border border-border bg-surface px-2 py-2 text-right font-figures text-sm text-ink outline-none focus:border-primary"
            />
            <button
              onClick={() => removeLine(i)}
              disabled={lines.length <= 2}
              className="rounded-lg px-2 py-1 text-sm text-ink-soft hover:text-debit disabled:opacity-30"
              aria-label="Remove line"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addLine}
        className="self-start text-sm text-coffee hover:underline"
      >
        + Add line
      </button>

      <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
        <span className="font-figures text-ink-soft">
          Debits {formatKobo(debitKobo)} · Credits {formatKobo(creditKobo)}
        </span>
        <span className={balanced ? "text-credit" : "text-pending"}>
          {balanced ? "Balanced" : "Not balanced"}
        </span>
      </div>

      {error && <p className="text-sm text-debit">{error}</p>}

      <button
        onClick={submit}
        disabled={!balanced || pending}
        className="self-start rounded-lg bg-primary px-5 py-2.5 font-medium text-ink transition hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post entry"}
      </button>
    </div>
  );
}
