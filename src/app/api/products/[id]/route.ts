/** Update a product's status (active|closed). Ledger writers only. */
import { NextResponse } from "next/server";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { setProductStatus } from "@/lib/products/products";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;
  const { id } = await params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (body.status !== "active" && body.status !== "closed") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await setProductStatus(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
