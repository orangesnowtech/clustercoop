"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReverseButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function reverse() {
    setPending(true);
    setError(null);
    const res = await fetch("/api/ledger/reverse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId, reason }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Reversal failed");
      setPending(false);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for reversal"
        className="w-full max-w-md rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-primary"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={reverse}
          disabled={pending}
          className="rounded-lg bg-debit px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Reversing…" : "Reverse this entry"}
        </button>
        {error && <span className="text-sm text-debit">{error}</span>}
      </div>
    </div>
  );
}
