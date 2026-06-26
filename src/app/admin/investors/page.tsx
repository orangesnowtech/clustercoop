import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function InvestorsPage() {
  await requireRole(["superadmin", "admin", "accounts", "compliance", "rm"]);
  return (
    <Placeholder
      title="Investors"
      description="Client accounts and onboarding."
    />
  );
}
