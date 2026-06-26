import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function LedgerPage() {
  await requireRole(["superadmin", "admin", "accounts"]);
  return (
    <Placeholder
      title="Ledger"
      description="Chart of accounts, journal entries, trial balance."
    />
  );
}
