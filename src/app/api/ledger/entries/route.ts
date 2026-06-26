/** Post a manual journal entry. Accounts/admin/superadmin only. */
import { NextResponse } from "next/server";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { postEntry } from "@/lib/ledger/post";
import { LedgerError, type PostLineInput } from "@/lib/ledger/types";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;

  let body: { memo?: string; postedDate?: string; lines?: PostLineInput[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!Array.isArray(body.lines)) {
    return NextResponse.json({ error: "lines is required" }, { status: 400 });
  }

  try {
    const result = await postEntry({
      type: "manual",
      reference: { source: "manual", id: user.uid },
      memo: body.memo ?? "",
      postedDate: body.postedDate || today(),
      createdBy: user.uid,
      createdByRole: user.role!,
      lines: body.lines,
    });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    }
    throw e;
  }
}
