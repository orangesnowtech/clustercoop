"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function KycReviewActions({ uid }: { uid: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "approve" | "reject") {
    setError(null);
    const body: { uid: string; reason?: string } = { uid };
    if (action === "reject") {
      const reason = window.prompt("Reason for rejection?")?.trim();
      if (!reason) return;
      body.reason = reason;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/kyc/${action}`, {
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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => run("approve")}
          disabled={busy !== null}
          className="rounded-lg bg-credit/10 px-3 py-1.5 text-xs font-medium text-credit transition hover:bg-credit/20 disabled:opacity-50"
        >
          {busy === "approve" ? "…" : "Approve"}
        </button>
        <button
          onClick={() => run("reject")}
          disabled={busy !== null}
          className="rounded-lg bg-debit/10 px-3 py-1.5 text-xs font-medium text-debit transition hover:bg-debit/20 disabled:opacity-50"
        >
          {busy === "reject" ? "…" : "Reject"}
        </button>
      </div>
      {error && <span className="text-xs text-debit">{error}</span>}
    </div>
  );
}
