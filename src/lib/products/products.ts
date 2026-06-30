/** Products (SERVER-ONLY) — investable product definitions managed by staff. */
import "server-only";
import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { LedgerError } from "@/lib/ledger/types";

export const PRODUCTS_COLLECTION = "products";

export type ProductStatus = "active" | "closed";

export interface Product {
  id: string;
  name: string;
  description: string;
  status: ProductStatus;
  expectedReturnBps: number | null;
  currency: string;
  createdBy: string;
}

export async function createProduct(input: {
  name: string;
  description?: string;
  expectedReturnBps?: number | null;
  createdBy: string;
}): Promise<{ id: string }> {
  if (!input.name?.trim()) {
    throw new LedgerError("invalid_product", "Product name is required.");
  }
  const id = randomUUID();
  await getAdminDb()
    .collection(PRODUCTS_COLLECTION)
    .doc(id)
    .set({
      id,
      name: input.name.trim(),
      description: input.description?.trim() ?? "",
      status: "active",
      expectedReturnBps: input.expectedReturnBps ?? null,
      currency: "NGN",
      createdBy: input.createdBy,
      createdAt: FieldValue.serverTimestamp(),
    });
  return { id };
}

export async function setProductStatus(id: string, status: ProductStatus): Promise<void> {
  const ref = getAdminDb().collection(PRODUCTS_COLLECTION).doc(id);
  if (!(await ref.get()).exists) {
    throw new LedgerError("unknown_product", "Product not found.");
  }
  await ref.update({ status, updatedAt: FieldValue.serverTimestamp() });
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getAdminDb().collection(PRODUCTS_COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as Product) : null;
}

export async function listProducts(opts: { activeOnly?: boolean } = {}): Promise<Product[]> {
  const snap = await getAdminDb().collection(PRODUCTS_COLLECTION).orderBy("name").get();
  const all = snap.docs.map((d) => d.data() as Product);
  return opts.activeOnly ? all.filter((p) => p.status === "active") : all;
}
