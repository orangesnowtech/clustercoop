/** Reverse a posted journal entry. Accounts/admin/superadmin only. */
import { NextResponse } from "next/server";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { reverseEntry } from "@/lib/ledger/reverse";
import { LedgerError } from "@/lib/ledger/types";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;

  let body: { entryId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.entryId) {
    return NextResponse.json({ error: "entryId is required" }, { status: 400 });
  }

  try {
    const result = await reverseEntry({
      entryId: body.entryId,
      reason: body.reason ?? "",
      reversalDate: new Date().toISOString().slice(0, 10),
      createdBy: user.uid,
      createdByRole: user.role!,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    throw e;
  }
}
