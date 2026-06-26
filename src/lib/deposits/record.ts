/**
 * recordVerifiedDeposit (SERVER-ONLY) — the single convergence point for both
 * completion paths (popup callback + webhook). The ONLY place a deposit posts
 * to the ledger. Idempotent by reference at both the ledger layer
 * (paystackKey) and the deposit-doc layer, so running both paths for one
 * transaction credits exactly once.
 *
 * `verify` is injected so tests can stub Paystack; production passes
 * verifyTransaction from lib/api/paystack.ts.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { postEntry } from "@/lib/ledger/post";
import { paystackKey } from "@/lib/ledger/idempotency";
import { ensureClientAccounts } from "@/lib/ledger/accounts";
import { sumKobo } from "@/lib/money";
import { buildDepositLines } from "./lines";
import { DEPOSITS_COLLECTION, type DepositDoc } from "./pending";
import type { PaystackVerifyResult } from "@/lib/api/paystack";

export interface RecordDeps {
  verify: (reference: string) => Promise<PaystackVerifyResult>;
  completedVia?: "callback" | "webhook";
}

export interface RecordResult {
  status: "success" | "failed" | "unknown";
  entryId?: string;
  replay?: boolean;
  reason?: string;
}

export async function recordVerifiedDeposit(
  reference: string,
  deps: RecordDeps,
): Promise<RecordResult> {
  const db = getAdminDb();
  const ref = db.collection(DEPOSITS_COLLECTION).doc(reference);

  // 1. Load the pending record (the trust anchor: owner uid + policy).
  const snap = await ref.get();
  if (!snap.exists) return { status: "unknown", reason: "unknown_reference" };
  const dep = snap.data() as DepositDoc;
  if (dep.status === "success" && dep.entryId) {
    return { status: "success", entryId: dep.entryId, replay: true };
  }

  // 2. Re-verify against Paystack — the source of truth for status & amount.
  const tx = await deps.verify(reference);
  if (tx.status !== "success") {
    await markFailed(reference, tx.status || "paystack_failed");
    return { status: "failed", reason: tx.status };
  }

  // 3. Never trust intendedKobo for crediting. Underpayment is rejected;
  //    we always credit what actually cleared (Paystack-reported amount).
  if (tx.amountKobo < dep.intendedKobo) {
    await markFailed(reference, "amount_mismatch");
    return { status: "failed", reason: "amount_mismatch" };
  }

  // 4. Defensive: ensure the client's sub-account exists.
  await ensureClientAccounts(dep.uid);

  // 5. Build balanced lines and post idempotently.
  const lines = buildDepositLines(tx.amountKobo, tx.feeKobo, dep.uid, dep.policy);
  const postedDate = (tx.paidAt ?? new Date().toISOString()).slice(0, 10);
  const result = await postEntry({
    idempotencyKey: paystackKey(reference),
    type: "deposit",
    reference: { source: "paystack", id: reference },
    memo: `Deposit ${reference}`,
    postedDate,
    createdBy: "system",
    createdByRole: "system",
    lines,
  });

  // 6. Converge the doc to success (tx-guarded; never overwrite an entryId).
  const creditedKobo = sumKobo(lines.map((l) => l.creditKobo ?? 0));
  await markSuccess(reference, {
    entryId: result.entryId,
    grossKobo: tx.amountKobo,
    feeKobo: tx.feeKobo,
    creditedKobo,
    paidAt: tx.paidAt,
    channel: tx.channel,
    completedVia: deps.completedVia ?? "callback",
  });

  return { status: "success", entryId: result.entryId, replay: result.idempotentReplay };
}

async function markSuccess(
  reference: string,
  data: {
    entryId: string;
    grossKobo: number;
    feeKobo: number;
    creditedKobo: number;
    paidAt: string | null;
    channel: string | null;
    completedVia: "callback" | "webhook";
  },
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(DEPOSITS_COLLECTION).doc(reference);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as DepositDoc | undefined;
    if (cur?.status === "success" && cur.entryId) return; // already converged
    tx.update(ref, {
      status: "success",
      ...data,
      failureReason: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function markFailed(reference: string, reason: string): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(DEPOSITS_COLLECTION).doc(reference);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as DepositDoc | undefined;
    if (cur?.status === "success") return; // never override a real success
    tx.update(ref, {
      status: "failed",
      failureReason: reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
