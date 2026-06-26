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
