/** Run a valuation (product or cash basis). Ledger writers only. */
import { NextResponse } from "next/server";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { runValuation, type ValuationBasis } from "@/lib/investments/valuation";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;

  let body: { basis?: ValuationBasis; rateBps?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { basis, rateBps } = body;
  if (
    !basis ||
    (basis.type !== "cash" && basis.type !== "product") ||
    (basis.type === "product" && !basis.productId)
  ) {
    return NextResponse.json({ error: "Invalid basis" }, { status: 400 });
  }
  if (typeof rateBps !== "number" || !Number.isInteger(rateBps) || rateBps === 0) {
    return NextResponse.json({ error: "Invalid rate" }, { status: 400 });
  }

  try {
    const result = await runValuation({
      basis,
      rateBps,
      actor: { uid: user.uid, role: user.role! },
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
