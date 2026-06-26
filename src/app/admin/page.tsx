import { requireRole } from "@/lib/auth/session";
import { STAFF_ROLES, ROLE_DEFS } from "@/lib/roles";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminPage() {
  const user = await requireRole(STAFF_ROLES);
  const roleLabel = user.role ? ROLE_DEFS[user.role].label : "Staff";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Back office
          </h1>
          <p className="text-sm text-ink-soft">
            {user.email} · {roleLabel}
          </p>
        </div>
        <SignOutButton />
      </header>
      <div className="rounded-2xl border border-border bg-white p-8 text-ink-soft">
        Ledger, KYC review, deposits &amp; withdrawals land here next.
      </div>
    </main>
  );
}
