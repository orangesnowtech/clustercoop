import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/roles";
import { canViewClient, getClient } from "@/lib/clients/access";
import { getClientStatement } from "@/lib/statements/statement";
import { formatKobo } from "@/lib/money";
import { StatementTable } from "@/components/statement/StatementTable";
import { DownloadStatementButton } from "@/components/statement/DownloadStatementButton";

export default async function InvestorDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const user = await requireRole(STAFF_ROLES);
  // RM scoping: only assigned clients are viewable.
  if (!(await canViewClient(user, uid))) notFound();

  const [client, { rows, summary }] = await Promise.all([
    getClient(uid),
    getClientStatement(uid),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href="/admin/investors" className="text-sm text-coffee hover:underline">
        ← Investors
      </Link>
      <div className="mt-2 mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            {client?.email ?? uid}
          </h1>
          <p className="text-sm text-ink-soft">
            Balance {formatKobo(summary.balanceKobo)} · in{" "}
            {formatKobo(summary.totalInKobo)} · out {formatKobo(summary.totalOutKobo)}
          </p>
        </div>
        <DownloadStatementButton uid={uid} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <StatementTable rows={rows} />
      </div>
    </main>
  );
}
