"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nairaToKobo } from "@/lib/money";
import { Field, SubmitButton, FormError } from "@/components/ui/Field";

export function WithdrawForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
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
        body: JSON.stringify({
          amountKobo: nairaToKobo(naira),
          destination: { bankName, accountNumber, accountName },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not submit request");
      setAmount("");
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

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
      <Field
        label="Bank name"
        value={bankName}
        onChange={(e) => setBankName(e.target.value)}
        required
      />
      <Field
        label="Account number"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        required
      />
      <Field
        label="Account name"
        value={accountName}
        onChange={(e) => setAccountName(e.target.value)}
        required
      />
      <FormError message={error} />
      <SubmitButton pending={pending}>Request withdrawal</SubmitButton>
    </form>
  );
}
