/** Request a withdrawal. Customer only. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { isValidKobo } from "@/lib/money";
import { LedgerError } from "@/lib/ledger/types";
import { createWithdrawalRequest } from "@/lib/withdrawals/request";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(["customer"]);
  if (error) return error;

  let body: {
    amountKobo?: number;
    destination?: { bankName?: string; accountNumber?: string; accountName?: string };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { amountKobo, destination } = body;
  if (typeof amountKobo !== "number" || !isValidKobo(amountKobo) || amountKobo <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (
    !destination?.bankName ||
    !destination?.accountNumber ||
    !destination?.accountName
  ) {
    return NextResponse.json({ error: "Bank details are required" }, { status: 400 });
  }

  try {
    const { id } = await createWithdrawalRequest({
      uid: user.uid,
      amountKobo,
      destination: {
        bankName: destination.bankName,
        accountNumber: destination.accountNumber,
        accountName: destination.accountName,
      },
    });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
