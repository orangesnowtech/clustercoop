/**
 * Paystack API wrapper (SERVER-ONLY for verification).
 *
 * All Paystack access goes through this module — never call Paystack directly
 * from components. Deposits are only credited after server-side verification:
 * the webhook signature proves the request came from Paystack, and the verify
 * endpoint proves the amount actually paid (never trust client/webhook bodies).
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { Kobo } from "@/lib/money";

/** Browser-safe public config for the inline popup. */
export function paystackPublicConfig() {
  return { publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY };
}

export interface PaystackBank {
  name: string;
  code: string;
}

/**
 * Nigerian bank list from Paystack (name + transfer code). Cached a day —
 * banks rarely change. Returns [] if the secret is missing or the call fails
 * (the form then falls back to a free-text bank name).
 */
export async function listBanks(): Promise<PaystackBank[]> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return [];
  try {
    const res = await fetch("https://api.paystack.co/bank?currency=NGN", {
      headers: { Authorization: `Bearer ${secret}` },
      next: { revalidate: 86400 },
    });
    const json = await res.json();
    if (!Array.isArray(json?.data)) return [];
    // Paystack can return several entries sharing one code — keep one per code.
    const byCode = new Map<string, PaystackBank>();
    for (const b of json.data as Array<{ name: string; code: string }>) {
      if (b.code && !byCode.has(b.code)) byCode.set(b.code, { name: b.name, code: b.code });
    }
    return [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

export interface PaystackVerifyResult {
  status: string; // "success" | "failed" | "abandoned" | ...
  reference: string;
  amountKobo: Kobo; // gross charged
  feeKobo: Kobo; // Paystack fee
  paidAt: string | null; // ISO timestamp
  channel: string | null;
}

/**
 * Verify a transaction against Paystack's API — the source of truth for amount
 * and status. Throws if the secret key is missing or the request fails.
 */
export async function verifyTransaction(
  reference: string,
): Promise<PaystackVerifyResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not set (server-only).");

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secret}` }, cache: "no-store" },
  );
  const json = await res.json();
  if (!res.ok || !json?.status) {
    throw new Error(
      `Paystack verify failed (${res.status}): ${json?.message ?? "unknown"}`,
    );
  }
  const d = json.data;
  return {
    status: d.status,
    reference: d.reference,
    amountKobo: d.amount, // Paystack amounts are already in kobo (integer)
    feeKobo: d.fees ?? 0,
    paidAt: d.paid_at ?? d.paidAt ?? null,
    channel: d.channel ?? null,
  };
}

/**
 * Verify a Paystack webhook signature: x-paystack-signature must equal
 * HMAC_SHA512(secretKey, rawBody). Timing-safe; false on any missing input.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
