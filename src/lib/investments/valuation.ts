/**
 * Valuation run (SERVER-ONLY) — apply a % return to a product's holders or to
 * every client's cash. One idempotent ledger entry per client (valuationKey),
 * looped (never a mega-transaction). Re-running/retrying posts each client at
 * most once.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { postEntry } from "@/lib/ledger/post";
import { getAccount, COLLECTIONS } from "@/lib/ledger/accounts";
import { valuationKey } from "@/lib/ledger/idempotency";
import { clientSubAccountId, holdingSubAccountId, ACCOUNT_CODES } from "@/lib/ledger/chart";
import { LedgerError, type Account } from "@/lib/ledger/types";
import type { Role } from "@/lib/roles";
import { applyRateBps } from "./rate";
import { buildValuationLines } from "./lines";
import { listProductHolders, refreshHoldingValue } from "./holdings";
import { getProduct } from "@/lib/products/products";

export const VALUATION_RUNS_COLLECTION = "valuationRuns";

export type ValuationBasis =
  | { type: "product"; productId: string }
  | { type: "cash" };

interface RunInput {
  basis: ValuationBasis;
  rateBps: number;
  actor: { uid: string; role: Role | "system" };
}

interface Target {
  uid: string;
  accountId: string;
  balanceKobo: number;
  productId?: string;
}

/** Resolve who gets valued and the account/balance to apply the rate to. */
async function resolveTargets(basis: ValuationBasis): Promise<Target[]> {
  if (basis.type === "product") {
    const product = await getProduct(basis.productId);
    if (!product) throw new LedgerError("unknown_product", "Product not found.");
    if (product.status !== "active") {
      throw new LedgerError("product_closed", "Cannot value a closed product.");
    }
    const holders = await listProductHolders(basis.productId);
    const targets: Target[] = [];
    for (const h of holders) {
      const acct = await getAccount(holdingSubAccountId(h.uid, basis.productId));
      if (acct && acct.cachedBalanceKobo > 0) {
        targets.push({
          uid: h.uid,
          accountId: holdingSubAccountId(h.uid, basis.productId),
          balanceKobo: acct.cachedBalanceKobo,
          productId: basis.productId,
        });
      }
    }
    return targets;
  }

  // Cash basis: every client cash sub-account with a positive balance.
  const snap = await getAdminDb()
    .collection(COLLECTIONS.accounts)
    .where("parentId", "==", ACCOUNT_CODES.CLIENT_FUNDS_PAYABLE)
    .get();
  return snap.docs
    .map((d) => d.data() as Account)
    .filter((a) => a.clientId && a.cachedBalanceKobo > 0)
    .map((a) => ({
      uid: a.clientId!,
      accountId: clientSubAccountId(a.clientId!),
      balanceKobo: a.cachedBalanceKobo,
    }));
}

export async function runValuation(input: RunInput): Promise<{
  runId: string;
  clientCount: number;
  totalKobo: number;
}> {
  if (!Number.isInteger(input.rateBps) || input.rateBps === 0) {
    throw new LedgerError("invalid_rate", "Rate (bps) must be a non-zero integer.");
  }

  const db = getAdminDb();
  const runId = randomUUID();
  const runRef = db.collection(VALUATION_RUNS_COLLECTION).doc(runId);
  await runRef.set({
    runId,
    basis: input.basis,
    rateBps: input.rateBps,
    postedBy: input.actor.uid,
    status: "posting",
    createdAt: FieldValue.serverTimestamp(),
  });

  const targets = await resolveTargets(input.basis);
  const postedDate = new Date().toISOString().slice(0, 10);
  let clientCount = 0;
  let totalKobo = 0;

  for (const t of targets) {
    const gain = applyRateBps(t.balanceKobo, input.rateBps);
    if (gain === 0) continue;
    await postEntry({
      idempotencyKey: valuationKey(runId, t.uid),
      type: "valuation",
      reference: { source: "valuation", id: runId },
      memo: `Valuation ${input.rateBps} bps`,
      postedDate,
      createdBy: input.actor.uid,
      createdByRole: input.actor.role,
      lines: buildValuationLines(t.accountId, gain),
    });
    if (t.productId) await refreshHoldingValue(t.uid, t.productId);
    clientCount += 1;
    totalKobo += gain;
  }

  await runRef.update({ status: "posted", clientCount, totalKobo });
  return { runId, clientCount, totalKobo };
}

export async function listValuationRuns(limit = 50) {
  const snap = await getAdminDb()
    .collection(VALUATION_RUNS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data());
}
