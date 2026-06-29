import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { verifyMetamapWebhook, decodeMetadataNonce } from "./metamap";

const SECRET = "metamap_webhook_secret";
const RAW = JSON.stringify({ eventName: "verification_completed", identityStatus: "verified" });
const goodSig = createHmac("sha256", SECRET).update(RAW).digest("hex");

beforeAll(() => {
  process.env.METAMAP_WEBHOOK_SECRET = SECRET;
});

describe("verifyMetamapWebhook", () => {
  it("accepts a correct HMAC-SHA256 signature", () => {
    expect(verifyMetamapWebhook(RAW, goodSig)).toBe(true);
  });
  it("rejects a tampered body", () => {
    expect(verifyMetamapWebhook(RAW + " ", goodSig)).toBe(false);
  });
  it("rejects a wrong secret", () => {
    const wrong = createHmac("sha256", "other").update(RAW).digest("hex");
    expect(verifyMetamapWebhook(RAW, wrong)).toBe(false);
  });
  it("rejects missing/empty/odd-length signatures without throwing", () => {
    expect(verifyMetamapWebhook(RAW, null)).toBe(false);
    expect(verifyMetamapWebhook(RAW, "")).toBe(false);
    expect(verifyMetamapWebhook(RAW, "abc")).toBe(false);
  });
});

describe("decodeMetadataNonce", () => {
  it("extracts the nonce from a base64 JSON blob", () => {
    const b64 = Buffer.from(JSON.stringify({ nonce: "abc-123" })).toString("base64");
    expect(decodeMetadataNonce(b64)).toBe("abc-123");
  });
  it("returns null for garbage / missing nonce / null", () => {
    expect(decodeMetadataNonce("not-base64-json!!")).toBeNull();
    expect(decodeMetadataNonce(Buffer.from(JSON.stringify({ x: 1 })).toString("base64"))).toBeNull();
    expect(decodeMetadataNonce(null)).toBeNull();
  });
});
