/** Reject a client's KYC. Compliance (+ admin/superadmin break-glass). */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { rejectKyc } from "@/lib/kyc/review";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(["compliance", "admin", "superadmin"]);
  if (error) return error;

  let body: { uid?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!body.uid) return NextResponse.json({ error: "uid is required" }, { status: 400 });
  if (!body.reason?.trim()) {
    return NextResponse.json({ error: "A reason is required" }, { status: 400 });
  }

  try {
    await rejectKyc(body.uid, user.uid, body.reason);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
