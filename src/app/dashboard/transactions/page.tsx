import { requireRole } from "@/lib/auth/session";
import { getClientStatement } from "@/lib/statements/statement";
import { StatementTable } from "@/components/statement/StatementTable";

export default async function TransactionsPage() {
  const user = await requireRole(["customer"]);
  const { rows } = await getClientStatement(user.uid);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Transactions
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Every movement on your account, most recent first.
      </p>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <StatementTable rows={rows} />
      </div>
    </main>
  );
}
