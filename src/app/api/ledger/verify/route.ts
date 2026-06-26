/** Re-derive balances from journal lines and report drift. Ledger writers only. */
import { NextResponse } from "next/server";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { verifyLedger } from "@/lib/ledger/verify";

export async function GET() {
  const { error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;
  const result = await verifyLedger();
  return NextResponse.json(result);
}
