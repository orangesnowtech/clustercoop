/** Post an approved withdrawal to the ledger. Accounts (+ admin/superadmin). */
import { NextResponse } from "next/server";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { postWithdrawal } from "@/lib/withdrawals/post";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;

  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  try {
    const result = await postWithdrawal(body.id, { uid: user.uid, role: user.role! });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
