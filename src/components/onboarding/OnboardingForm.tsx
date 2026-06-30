"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, SubmitButton, FormError } from "@/components/ui/Field";
import type { PaystackBank } from "@/lib/api/paystack";

export function OnboardingForm({ banks }: { banks: PaystackBank[] }) {
  const router = useRouter();
  const [f, setF] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    address: "",
    nin: "",
    bvn: "",
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: f.firstName,
          middleName: f.middleName,
          lastName: f.lastName,
          phone: f.phone,
          address: f.address,
          nin: f.nin,
          bvn: f.bvn,
          bank: {
            bankName: f.bankName,
            bankCode: f.bankCode,
            accountNumber: f.accountNumber,
            accountName: f.accountName,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save your details");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-medium text-ink">Your details</legend>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="First name" value={f.firstName} onChange={set("firstName")} required />
          <Field label="Middle name" value={f.middleName} onChange={set("middleName")} />
          <Field label="Last name" value={f.lastName} onChange={set("lastName")} required />
        </div>
        <Field label="Phone number" value={f.phone} onChange={set("phone")} required />
        <Field label="Contact address" value={f.address} onChange={set("address")} required />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="National ID Number (NIN)" value={f.nin} onChange={set("nin")} required />
          <Field label="Bank Verification Number (BVN)" value={f.bvn} onChange={set("bvn")} required />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-1 text-sm font-medium text-ink">
          Bank account (the only account we can pay withdrawals to)
        </legend>
        {banks.length > 0 ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-soft">Bank</span>
            <select
              required
              value={f.bankCode}
              onChange={(e) => {
                const bank = banks.find((b) => b.code === e.target.value);
                setF((s) => ({ ...s, bankCode: e.target.value, bankName: bank?.name ?? "" }));
              }}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Select your bank…</option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <Field label="Bank name" value={f.bankName} onChange={set("bankName")} required />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Account number" value={f.accountNumber} onChange={set("accountNumber")} required />
          <Field label="Account name" value={f.accountName} onChange={set("accountName")} required />
        </div>
      </fieldset>

      <p className="text-xs text-ink-soft">
        These details must match the identity documents you submit during verification.
      </p>
      <FormError message={error} />
      <SubmitButton pending={pending}>Save & continue</SubmitButton>
    </form>
  );
}
