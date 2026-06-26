import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function ReportsPage() {
  await requireRole(["superadmin", "admin", "accounts", "compliance"]);
  return (
    <Placeholder title="Reports" description="Operational and financial reports." />
  );
}
