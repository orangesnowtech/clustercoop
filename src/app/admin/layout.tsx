import { requireRole } from "@/lib/auth/session";
import { STAFF_ROLES } from "@/lib/roles";
import { AppShell } from "@/components/nav/AppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(STAFF_ROLES);
  return <AppShell user={user}>{children}</AppShell>;
}
