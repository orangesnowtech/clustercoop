import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { isOnboarded } from "@/lib/clients/profile";
import { AppShell } from "@/components/nav/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["customer"]);
  // First-run gate: collect onboarding details before the dashboard is usable.
  if (!(await isOnboarded(user.uid))) redirect("/onboarding");
  return <AppShell user={user}>{children}</AppShell>;
}
