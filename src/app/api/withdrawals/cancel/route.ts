/** Cancel a pending withdrawal. Customer only; ownership enforced server-side. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { cancelWithdrawal } from "@/lib/withdrawals/review";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(["customer"]);
  if (error) return error;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    await cancelWithdrawal(body.id, user.uid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
