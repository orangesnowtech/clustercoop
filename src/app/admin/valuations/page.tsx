import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function ValuationsPage() {
  await requireRole(["superadmin", "admin", "accounts"]);
  return (
    <Placeholder
      title="Valuations"
      description="Post valuations and returns."
    />
  );
}
