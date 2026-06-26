import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/nav/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["customer"]);
  return <AppShell user={user}>{children}</AppShell>;
}
