/** Initialize a deposit: create the server-side pending record. Customer only. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { isValidKobo } from "@/lib/money";
import { createPendingDeposit, assertCanDeposit } from "@/lib/deposits/pending";
import { paystackPublicConfig } from "@/lib/api/paystack";

// ₦1 .. ₦10,000,000 — sanity bounds in kobo.
const MIN_KOBO = 100;
const MAX_KOBO = 10_000_000 * 100;

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(["customer"]);
  if (error) return error;

  let body: { amountKobo?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const amountKobo = body.amountKobo;
  if (
    typeof amountKobo !== "number" ||
    !isValidKobo(amountKobo) ||
    amountKobo < MIN_KOBO ||
    amountKobo > MAX_KOBO
  ) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  try {
    await assertCanDeposit(user.uid);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Not allowed" },
      { status: 403 },
    );
  }

  const { reference } = await createPendingDeposit({
    uid: user.uid,
    intendedKobo: amountKobo,
    email: user.email ?? "",
  });

  return NextResponse.json({
    reference,
    amountKobo,
    email: user.email,
    publicKey: paystackPublicConfig().publicKey,
  });
}
