import { requireRole } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";

export default async function DashboardPage() {
  const user = await requireRole(["customer"]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Your portfolio
          </h1>
          <p className="text-sm text-ink-soft">{user.email}</p>
        </div>
        <SignOutButton />
      </header>
      <div className="rounded-2xl border border-border bg-white p-8 text-ink-soft">
        Portfolio, statements and deposits land here next.
      </div>
    </main>
  );
}
