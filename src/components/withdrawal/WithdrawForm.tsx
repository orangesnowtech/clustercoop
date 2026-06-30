"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nairaToKobo } from "@/lib/money";
import { Field, SubmitButton, FormError } from "@/components/ui/Field";

interface Bank {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export function WithdrawForm({ bank }: { bank: Bank | null }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const naira = parseFloat(amount);
    if (!Number.isFinite(naira) || naira <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/withdrawals/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo: nairaToKobo(naira) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not submit request");
      setAmount("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  const masked = bank ? "••••" + bank.accountNumber.slice(-4) : null;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field
        label="Amount (₦)"
        type="number"
        min="1"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
        <span className="block text-xs text-ink-soft">Pays to your verified account</span>
        {bank ? (
          <span className="text-ink">
            {bank.bankName} · {masked} · {bank.accountName}
          </span>
        ) : (
          <span className="text-debit">No verified bank on file — complete onboarding.</span>
        )}
      </div>
      <FormError message={error} />
      <SubmitButton pending={pending}>Request withdrawal</SubmitButton>
    </form>
  );
}
