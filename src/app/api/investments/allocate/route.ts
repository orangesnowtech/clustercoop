/** Invest cash into a product. Customer (self) or ledger writer (any uid). */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { isValidKobo } from "@/lib/money";
import { LedgerError } from "@/lib/ledger/types";
import { allocate } from "@/lib/investments/allocate";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole([
    "customer",
    "superadmin",
    "admin",
    "accounts",
  ]);
  if (error) return error;

  let body: { productId?: string; amountKobo?: number; uid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.productId) {
    return NextResponse.json({ error: "productId is required" }, { status: 400 });
  }
  if (typeof body.amountKobo !== "number" || !isValidKobo(body.amountKobo) || body.amountKobo <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Customers act on themselves; staff may pass a target uid.
  const uid = user.role === "customer" ? user.uid : body.uid ?? user.uid;

  try {
    const { entryId } = await allocate({
      uid,
      productId: body.productId,
      amountKobo: body.amountKobo,
      actor: { uid: user.uid, role: user.role! },
    });
    return NextResponse.json({ ok: true, entryId });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
