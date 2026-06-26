/**
 * Idempotency — PURE helpers. A stable key + deterministic entry id let a
 * retried source (e.g. a Paystack webhook) post at most once. The key is
 * guarded by a ledgerRefs/{key} doc read inside the posting transaction; the
 * derived entry id + tx.create closes the race window.
 */

/** Firestore doc ids can't contain "/". Make a key safe to use as a doc id. */
function sanitize(part: string): string {
  return part.replace(/\//g, "_");
}

export function paystackKey(reference: string): string {
  return `paystack:${sanitize(reference)}`;
}

export function withdrawalKey(requestId: string): string {
  return `withdrawal:${sanitize(requestId)}`;
}

export function valuationKey(runId: string, uid: string): string {
  return `valuation:${sanitize(runId)}:${sanitize(uid)}`;
}

/** Deterministic entry id from an idempotency key (collision-free per key). */
export function deterministicEntryId(idempotencyKey: string): string {
  return `e_${sanitize(idempotencyKey)}`;
}

/** A ledgerRefs doc id is the key itself, sanitized. */
export function refDocId(idempotencyKey: string): string {
  return sanitize(idempotencyKey);
}
