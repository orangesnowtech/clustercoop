/**
 * Paystack webhook — the reliable completion backstop (public, no session).
 *
 * Verifies the HMAC signature over the RAW body, then re-verifies the
 * transaction via Paystack's API (never trusts the webhook body's amount).
 * Always returns 200 on a handled event so Paystack stops retrying;
 * idempotency makes duplicate deliveries no-ops.
 */
import { NextResponse } from "next/server";
import { verifyTransaction, verifyWebhookSignature } from "@/lib/api/paystack";
import { recordVerifiedDeposit } from "@/lib/deposits/record";

export async function POST(req: Request) {
  const raw = await req.text(); // RAW body required for signature verification
  const signature = req.headers.get("x-paystack-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  // Acknowledge anything we don't act on so Paystack doesn't retry.
  if (event.event !== "charge.success" || !event.data?.reference) {
    return NextResponse.json({ received: true });
  }

  try {
    await recordVerifiedDeposit(event.data.reference, {
      verify: verifyTransaction,
      completedVia: "webhook",
    });
  } catch {
    // Transient failure → 500 so Paystack retries later.
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
