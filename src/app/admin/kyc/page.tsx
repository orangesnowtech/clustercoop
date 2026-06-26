import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function KycPage() {
  await requireRole(["superadmin", "admin", "compliance"]);
  return (
    <Placeholder
      title="KYC Review"
      description="Review and approve identity verification (MetaMap)."
    />
  );
}
