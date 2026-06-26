import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { LEDGER_WRITERS } from "@/lib/auth/api";
import { listAccounts } from "@/lib/ledger/accounts";
import { NewEntryForm } from "@/components/ledger/NewEntryForm";

export default async function NewEntryPage() {
  await requireRole(LEDGER_WRITERS);
  const accounts = await listAccounts();
  const postable = accounts
    .filter((a) => !a.isControl && a.active)
    .map((a) => ({ id: a.id, code: a.code, name: a.name }));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
      <Link href="/admin/ledger" className="text-sm text-coffee hover:underline">
        ← Ledger
      </Link>
      <h1 className="mb-1 mt-3 font-display text-2xl font-semibold text-ink">
        New journal entry
      </h1>
      <p className="mb-6 text-sm text-ink-soft">
        Debits must equal credits. Posted entries are immutable — correct via
        reversal.
      </p>
      {postable.length === 0 ? (
        <p className="text-sm text-ink-soft">
          No postable accounts yet — seed the chart first.
        </p>
      ) : (
        <NewEntryForm accounts={postable} />
      )}
    </main>
  );
}
