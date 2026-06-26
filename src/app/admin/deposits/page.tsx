import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function DepositsPage() {
  await requireRole(["superadmin", "admin", "accounts"]);
  return (
    <Placeholder
      title="Deposits"
      description="Manage and reconcile client deposits."
    />
  );
}
