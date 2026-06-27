/**
 * Statement PDF export. Scoped: a customer can export only their own; staff per
 * canViewClient (rm limited to assigned clients). The one access-controlled
 * surface for client financial data, so the canViewClient check is mandatory.
 */
import { getCurrentUser } from "@/lib/auth/session";
import { canViewClient, getClient } from "@/lib/clients/access";
import { getClientStatement } from "@/lib/statements/statement";
import { renderStatementPdf } from "@/lib/statements/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> },
) {
  const { uid } = await params;
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!(await canViewClient(user, uid))) {
    return new Response("Forbidden", { status: 403 });
  }

  const [{ rows, summary }, client] = await Promise.all([
    getClientStatement(uid),
    getClient(uid),
  ]);

  const pdf = await renderStatementPdf({
    client: { uid, email: client?.email ?? null },
    rows,
    summary,
    generatedOn: new Date().toISOString().slice(0, 10),
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cluster-statement-${uid}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
