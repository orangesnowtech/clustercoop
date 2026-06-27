"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Actions {
  approve?: boolean;
  reject?: boolean;
  post?: boolean;
  cancel?: boolean;
}

const ENDPOINT: Record<keyof Actions, string> = {
  approve: "/api/withdrawals/approve",
  reject: "/api/withdrawals/reject",
  post: "/api/withdrawals/post",
  cancel: "/api/withdrawals/cancel",
};

const LABEL: Record<keyof Actions, string> = {
  approve: "Approve",
  reject: "Reject",
  post: "Post to ledger",
  cancel: "Cancel",
};

const STYLE: Record<keyof Actions, string> = {
  approve: "bg-credit/10 text-credit hover:bg-credit/20",
  reject: "bg-debit/10 text-debit hover:bg-debit/20",
  post: "bg-primary text-ink hover:bg-primary-pressed",
  cancel: "border border-border text-ink-soft hover:bg-surface",
};

export function WithdrawalActions({ id, actions }: { id: string; actions: Actions }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: keyof Actions) {
    setError(null);
    const body: { id: string; reason?: string } = { id };
    if (action === "reject") {
      const reason = window.prompt("Reason for rejection?")?.trim();
      if (!reason) return;
      body.reason = reason;
    }
    setBusy(action);
    try {
      const res = await fetch(ENDPOINT[action], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Action failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const keys = (Object.keys(actions) as (keyof Actions)[]).filter((k) => actions[k]);
  if (keys.length === 0) return null;

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => run(k)}
            disabled={busy !== null}
            className={
              "rounded-lg px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 " +
              STYLE[k]
            }
          >
            {busy === k ? "…" : LABEL[k]}
          </button>
        ))}
      </div>
      {error && <span className="text-xs text-debit">{error}</span>}
    </div>
  );
}
