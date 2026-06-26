"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { nairaToKobo } from "@/lib/money";

interface PaystackHandler {
  openIframe: () => void;
}
interface PaystackPop {
  setup: (opts: {
    key: string;
    email: string;
    amount: number;
    ref: string;
    callback: (res: { reference: string }) => void;
    onClose: () => void;
  }) => PaystackHandler;
}
declare global {
  interface Window {
    PaystackPop?: PaystackPop;
  }
}

const INLINE_SRC = "https://js.paystack.co/v1/inline.js";

function loadPaystack(): Promise<PaystackPop> {
  return new Promise((resolve, reject) => {
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const existing = document.querySelector(`script[src="${INLINE_SRC}"]`);
    const onLoad = () =>
      window.PaystackPop
        ? resolve(window.PaystackPop)
        : reject(new Error("Paystack failed to load"));
    if (existing) {
      existing.addEventListener("load", onLoad);
      existing.addEventListener("error", () => reject(new Error("Paystack failed to load")));
      return;
    }
    const s = document.createElement("script");
    s.src = INLINE_SRC;
    s.async = true;
    s.onload = onLoad;
    s.onerror = () => reject(new Error("Paystack failed to load"));
    document.body.appendChild(s);
  });
}

export function DepositForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    const naira = parseFloat(amount);
    if (!Number.isFinite(naira) || naira <= 0) {
      setStatus("Enter a valid amount.");
      return;
    }
    setPending(true);
    try {
      // 1. Server creates the pending record + returns the reference.
      const initRes = await fetch("/api/deposits/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountKobo: nairaToKobo(naira) }),
      });
      if (!initRes.ok) {
        const b = await initRes.json().catch(() => ({}));
        throw new Error(b.error ?? "Could not start deposit");
      }
      const { reference, amountKobo, email, publicKey } = await initRes.json();

      // 2. Open the Paystack popup.
      const Paystack = await loadPaystack();
      const handler = Paystack.setup({
        key: publicKey,
        email,
        amount: amountKobo,
        ref: reference,
        callback: (res) => {
          // 3. Verify server-side (the browser "success" is never trusted).
          void finish(res.reference);
        },
        onClose: () => {
          setPending(false);
          setStatus("Payment window closed.");
        },
      });
      handler.openIframe();
    } catch (err) {
      setPending(false);
      setStatus(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  async function finish(reference: string) {
    setStatus("Confirming payment…");
    const res = await fetch("/api/deposits/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    });
    const body = await res.json().catch(() => ({}));
    setPending(false);
    if (res.ok && body.status === "success") {
      setStatus("Deposit confirmed.");
      setAmount("");
      router.refresh();
    } else {
      setStatus("Payment could not be confirmed. It will update shortly if successful.");
      router.refresh();
    }
  }

  return (
    <form onSubmit={start} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-ink-soft">
          Amount (₦)
        </span>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-right font-figures text-ink outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-primary px-5 py-2.5 font-medium text-ink transition hover:bg-primary-pressed disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Processing…" : "Deposit"}
      </button>
      {status && <p className="text-sm text-ink-soft">{status}</p>}
    </form>
  );
}
