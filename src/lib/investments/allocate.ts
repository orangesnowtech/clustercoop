/**
 * Allocate / redeem (SERVER-ONLY) — move a client's claim between cash and a
 * product holding via the ledger. Allocation requires an active product, KYC,
 * and (via postEntry preconditions) sufficient cash; redemption requires
 * sufficient holding value. Both update the holdings projection.
 */
import "server-only";
import { postEntry } from "@/lib/ledger/post";
import { ensureClientAccounts } from "@/lib/ledger/accounts";
import { clientSubAccountId, holdingSubAccountId } from "@/lib/ledger/chart";
import { LedgerError } from "@/lib/ledger/types";
import type { Role } from "@/lib/roles";
import { getProduct } from "@/lib/products/products";
import { assertCanInvest } from "@/lib/kyc/gate";
import { buildAllocationLines, buildRedemptionLines } from "./lines";
import { ensureHoldingAccount, syncHoldingProjection } from "./holdings";
import type { Kobo } from "@/lib/money";

interface Actor {
  uid: string;
  role: Role | "system";
}

export async function allocate(input: {
  uid: string;
  productId: string;
  amountKobo: Kobo;
  actor: Actor;
}): Promise<{ entryId: string }> {
  const { uid, productId, amountKobo, actor } = input;

  const product = await getProduct(productId);
  if (!product) throw new LedgerError("unknown_product", "Product not found.");
  if (product.status !== "active") {
    throw new LedgerError("product_closed", "This product is not open for investment.");
  }

  await assertCanInvest(uid);
  await ensureClientAccounts(uid);
  await ensureHoldingAccount(uid, productId);

  const { entryId } = await postEntry({
    type: "allocation",
    reference: { source: "allocation", id: `${uid}:${productId}` },
    memo: `Invest in ${product.name}`,
    postedDate: new Date().toISOString().slice(0, 10),
    createdBy: actor.uid,
    createdByRole: actor.role,
    lines: buildAllocationLines(uid, productId, amountKobo),
    preconditions: [{ accountId: clientSubAccountId(uid), minBalanceKobo: amountKobo }],
  });

  await syncHoldingProjection(uid, productId, amountKobo);
  return { entryId };
}

export async function redeem(input: {
  uid: string;
  productId: string;
  amountKobo: Kobo;
  actor: Actor;
}): Promise<{ entryId: string }> {
  const { uid, productId, amountKobo, actor } = input;

  const product = await getProduct(productId);
  if (!product) throw new LedgerError("unknown_product", "Product not found.");

  await ensureClientAccounts(uid);
  await ensureHoldingAccount(uid, productId);

  const { entryId } = await postEntry({
    type: "redemption",
    reference: { source: "redemption", id: `${uid}:${productId}` },
    memo: `Redeem from ${product.name}`,
    postedDate: new Date().toISOString().slice(0, 10),
    createdBy: actor.uid,
    createdByRole: actor.role,
    lines: buildRedemptionLines(uid, productId, amountKobo),
    preconditions: [
      { accountId: holdingSubAccountId(uid, productId), minBalanceKobo: amountKobo },
    ],
  });

  await syncHoldingProjection(uid, productId, -amountKobo);
  return { entryId };
}
