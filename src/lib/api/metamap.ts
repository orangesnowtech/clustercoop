/**
 * MetaMap (KYC) — server-side wrapper.
 *
 * All MetaMap access goes through this module — never call MetaMap directly
 * from components. The browser only renders the MetaMap button using the public
 * NEXT_PUBLIC_METAMAP_* values; verification RESULTS arrive via a signed webhook
 * which must be verified here with METAMAP_WEBHOOK_SECRET before any KYC status
 * is written to Firestore for Compliance to review.
 *
 * This is a step-1 scaffold: the signature/verification logic is stubbed and
 * fleshed out when the KYC flow is built (step 5).
 */
import "server-only";

/** Browser-safe SDK values for rendering the MetaMap button. */
export function metamapPublicConfig() {
  const clientId = process.env.NEXT_PUBLIC_METAMAP_CLIENT_ID;
  const flowId = process.env.NEXT_PUBLIC_METAMAP_FLOW_ID;
  return { clientId, flowId };
}

/**
 * Verify a MetaMap webhook signature. TODO (step 5): implement the real HMAC
 * check against METAMAP_WEBHOOK_SECRET per MetaMap's webhook docs. Until then
 * this returns false so nothing is trusted by accident.
 */
export function verifyMetamapWebhook(_rawBody: string, _signature: string | null): boolean {
  const secret = process.env.METAMAP_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("METAMAP_WEBHOOK_SECRET is not set (server-only).");
  }
  return false;
}
