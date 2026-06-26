import { describe, it, expect, beforeAll } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./paystack";

const SECRET = "sk_test_dummy_secret";
const RAW = JSON.stringify({ event: "charge.success", data: { reference: "r1" } });
const goodSig = createHmac("sha512", SECRET).update(RAW).digest("hex");

beforeAll(() => {
  process.env.PAYSTACK_SECRET_KEY = SECRET;
});

describe("verifyWebhookSignature", () => {
  it("accepts a correct HMAC-SHA512 signature", () => {
    expect(verifyWebhookSignature(RAW, goodSig)).toBe(true);
  });

  it("rejects a tampered body", () => {
    expect(verifyWebhookSignature(RAW + " ", goodSig)).toBe(false);
  });

  it("rejects a wrong signature", () => {
    const wrong = createHmac("sha512", "other").update(RAW).digest("hex");
    expect(verifyWebhookSignature(RAW, wrong)).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyWebhookSignature(RAW, null)).toBe(false);
  });

  it("does not throw on a malformed (odd-length) signature", () => {
    expect(verifyWebhookSignature(RAW, "abc")).toBe(false);
  });
});
