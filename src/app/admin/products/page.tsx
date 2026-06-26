import { requireRole } from "@/lib/auth/session";
import { Placeholder } from "@/components/Placeholder";

export default async function ProductsPage() {
  await requireRole(["superadmin", "admin", "accounts"]);
  return (
    <Placeholder
      title="Products"
      description="Investment products and portfolios."
    />
  );
}
