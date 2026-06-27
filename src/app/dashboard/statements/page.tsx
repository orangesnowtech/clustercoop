import { requireRole } from "@/lib/auth/session";
import { getClientStatement } from "@/lib/statements/statement";
import { formatKobo } from "@/lib/money";
import { StatementTable } from "@/components/statement/StatementTable";
import { DownloadStatementButton } from "@/components/statement/DownloadStatementButton";

export default async function StatementsPage() {
  const user = await requireRole(["customer"]);
  const { rows, summary } = await getClientStatement(user.uid);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
            Statements
          </h1>
          <p className="text-sm text-ink-soft">
            Your full account statement. Balance {formatKobo(summary.balanceKobo)}.
          </p>
        </div>
        <DownloadStatementButton uid={user.uid} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <StatementTable rows={rows} />
      </div>
    </main>
  );
}
