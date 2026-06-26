import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function WithdrawalsPage() {
  await requireRole(["superadmin", "admin", "accounts", "compliance"]);
  return (
    <Placeholder
      title="Withdrawals"
      description="Approve and post client withdrawals."
    />
  );
}
