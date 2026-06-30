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

export interface MetamapField {
  label: string;
  value: string;
}

/** Flatten MetaMap's verification documents into label/value pairs. */
function normalizeMetamap(data: unknown): { fields: MetamapField[] } {
  const out: MetamapField[] = [];
  const docs = (data as { documents?: unknown })?.documents;
  if (Array.isArray(docs)) {
    for (const d of docs) {
      const fields = (d as { fields?: Record<string, unknown> })?.fields ?? {};
      for (const [k, v] of Object.entries(fields)) {
        const value =
          v && typeof v === "object" && "value" in v
            ? (v as { value: unknown }).value
            : v;
        if (value != null && value !== "") out.push({ label: k, value: String(value) });
      }
    }
  }
  return { fields: out };
}

/**
 * Fetch a completed verification's extracted fields from MetaMap (OAuth
 * client-credentials → GET the resource URL the webhook gave us). Returns null
 * if METAMAP_CLIENT_SECRET / resource are missing or the call fails — the
 * compliance UI then shows "unavailable".
 */
export async function fetchMetamapVerification(
  resourceUrl: string | null | undefined,
): Promise<{ fields: MetamapField[] } | null> {
  const clientId = process.env.NEXT_PUBLIC_METAMAP_CLIENT_ID;
  const clientSecret = process.env.METAMAP_CLIENT_SECRET;
  if (!resourceUrl || !clientId || !clientSecret) return null;
  try {
    const tokenRes = await fetch("https://api.getmati.com/oauth", {
      method: "POST",
      headers: {
        Authorization:
          "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
    const token = (await tokenRes.json())?.access_token;
    if (!token) return null;
    const res = await fetch(resourceUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return normalizeMetamap(await res.json());
  } catch {
    return null;
  }
}
