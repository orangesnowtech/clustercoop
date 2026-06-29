/**
 * MetaMap webhook — verification results (public, no session). Verifies the
 * HMAC-SHA256 signature over the RAW body, then resolves the nonce→uid binding
 * and advances the client to in_review. Never trusts a uid from the body.
 */
import { NextResponse } from "next/server";
import { verifyMetamapWebhook, decodeMetadataNonce } from "@/lib/api/metamap";
import { recordKycWebhook } from "@/lib/kyc/record";
import type { MetamapVerdict } from "@/lib/kyc/types";

function readVerdict(body: Record<string, unknown>): MetamapVerdict | null {
  const v = body.identityStatus ?? body.status;
  return v === "verified" || v === "rejected" || v === "reviewNeeded" ? v : null;
}

function readNonce(body: Record<string, unknown>): string | null {
  const meta = body.metadata;
  // MetaMap may echo metadata as a base64 string or a decoded object.
  if (typeof meta === "string") return decodeMetadataNonce(meta);
  if (meta && typeof meta === "object" && typeof (meta as { nonce?: unknown }).nonce === "string") {
    return (meta as { nonce: string }).nonce;
  }
  return null;
}

export async function POST(req: Request) {
  const raw = await req.text(); // RAW body required for signature verification
  if (!verifyMetamapWebhook(raw, req.headers.get("x-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    await recordKycWebhook({
      nonce: readNonce(body),
      eventName: String(body.eventName ?? ""),
      verdict: readVerdict(body),
      verificationId: (body.verificationId ?? body.identityId ?? null) as string | null,
    });
  } catch {
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
