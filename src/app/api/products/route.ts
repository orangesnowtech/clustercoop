/** Products: GET list (any authed) · POST create (ledger writers). */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { apiRequireRole, LEDGER_WRITERS } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { createProduct, listProducts } from "@/lib/products/products";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Customers only see active products; staff see all.
  const products = await listProducts({ activeOnly: user.role === "customer" });
  return NextResponse.json({ products });
}

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(LEDGER_WRITERS);
  if (error) return error;

  let body: { name?: string; description?: string; expectedReturnBps?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const { id } = await createProduct({
      name: body.name ?? "",
      description: body.description,
      expectedReturnBps:
        typeof body.expectedReturnBps === "number" ? body.expectedReturnBps : null,
      createdBy: user.uid,
    });
    return NextResponse.json({ id });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
