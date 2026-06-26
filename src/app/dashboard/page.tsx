import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getClientLedger } from "@/lib/ledger/statements";
import { formatKobo } from "@/lib/money";

export default async function DashboardPage() {
  const user = await requireRole(["customer"]);
  const { balanceKobo } = await getClientLedger(user.uid);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
        Your portfolio
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Balance, holdings and returns at a glance.
      </p>

      <section className="mb-6 rounded-2xl border border-border bg-white p-8">
        <p className="text-sm text-ink-soft">Available balance</p>
        <p className="font-figures text-4xl font-semibold text-ink">
          {formatKobo(balanceKobo)}
        </p>
        <Link
          href="/dashboard/deposit"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed"
        >
          Deposit funds
        </Link>
      </section>

      <div className="rounded-2xl border border-border bg-white p-8 text-ink-soft">
        Holdings and returns land here next.
      </div>
    </main>
  );
}
