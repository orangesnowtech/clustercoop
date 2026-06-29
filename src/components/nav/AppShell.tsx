import Link from "next/link";
import { Sidebar } from "@/components/nav/Sidebar";
import { SignOutButton } from "@/components/SignOutButton";
import { Logo } from "@/components/Logo";
import { navItemsFor } from "@/lib/nav";
import { ROLE_DEFS } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth/session";

/**
 * AppShell — the authenticated layout: brand, role-aware sidebar, top bar with
 * the user's identity + role, and sign-out. Server component; receives the
 * already-verified session user from the area layout.
 */
export function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const items = navItemsFor(user.role);
  const roleLabel = user.role ? ROLE_DEFS[user.role].label : "";
  const home = user.role === "customer" ? "/dashboard" : "/admin";

  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-white p-4 md:flex">
        <Link href={home} className="mb-6 px-3" aria-label="Cluster home">
          <Logo className="h-7 w-auto" priority />
        </Link>
        <Sidebar items={items} />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
          <Link href={home} className="md:hidden" aria-label="Cluster home">
            <Logo className="h-6 w-auto" />
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right text-sm leading-tight">
              <div className="text-ink">{user.email}</div>
              {roleLabel && (
                <div className="text-xs text-coffee">{roleLabel}</div>
              )}
            </div>
            <SignOutButton />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
