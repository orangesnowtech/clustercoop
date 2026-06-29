/**
 * MetaMap (KYC) — server-side wrapper.
 *
 * All MetaMap access goes through this module — never call MetaMap directly
 * from components. The browser only renders the MetaMap button using the public
 * NEXT_PUBLIC_METAMAP_* values; verification RESULTS arrive via a signed webhook
 * which must be verified here with METAMAP_WEBHOOK_SECRET before any KYC status
 * is written to Firestore for Compliance to review.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Browser-safe SDK values for rendering the MetaMap button. */
export function metamapPublicConfig() {
  const clientId = process.env.NEXT_PUBLIC_METAMAP_CLIENT_ID;
  const flowId = process.env.NEXT_PUBLIC_METAMAP_FLOW_ID;
  return { clientId, flowId };
}

/**
 * Verify a MetaMap webhook signature: the `x-signature` header must equal
 * HMAC_SHA256(METAMAP_WEBHOOK_SECRET, rawBody). Timing-safe; false on any
 * missing/malformed input. (Mirrors the Paystack webhook verify, SHA256.)
 */
export function verifyMetamapWebhook(
  rawBody: string,
  signature: string | null | undefined,
): boolean {
  const secret = process.env.METAMAP_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("METAMAP_WEBHOOK_SECRET is not set (server-only).");
  }
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length || a.length === 0) return false;
  return timingSafeEqual(a, b);
}

/**
 * Decode the base64 `metadata` blob the button echoes back and extract our
 * nonce. Untrusted input — returns null on anything malformed.
 */
export function decodeMetadataNonce(metadataB64: string | null | undefined): string | null {
  if (!metadataB64) return null;
  try {
    const json = JSON.parse(Buffer.from(metadataB64, "base64").toString("utf8"));
    return typeof json?.nonce === "string" ? json.nonce : null;
  } catch {
    return null;
  }
}
