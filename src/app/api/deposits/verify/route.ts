/** Verify a deposit after the popup returns. Customer only; owner-checked. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { getAdminDb } from "@/lib/firebase/admin";
import { recordVerifiedDeposit } from "@/lib/deposits/record";
import { DEPOSITS_COLLECTION, type DepositDoc } from "@/lib/deposits/pending";
import { getClientLedger } from "@/lib/ledger/statements";
import { verifyTransaction } from "@/lib/api/paystack";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(["customer"]);
  if (error) return error;

  let body: { reference?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  // Ownership check: a session may only verify its own deposit reference.
  const snap = await getAdminDb()
    .collection(DEPOSITS_COLLECTION)
    .doc(body.reference)
    .get();
  if (!snap.exists || (snap.data() as DepositDoc).uid !== user.uid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const result = await recordVerifiedDeposit(body.reference, {
    verify: verifyTransaction,
    completedVia: "callback",
  });

  const { balanceKobo } = await getClientLedger(user.uid);
  return NextResponse.json({ ...result, balanceKobo });
}
