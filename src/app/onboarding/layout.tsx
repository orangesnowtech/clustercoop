import { requireRole } from "@/lib/auth/session";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";

/** Minimal shell for onboarding — no dashboard nav until onboarding is done. */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["customer"]);
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-border bg-white px-6 py-3">
        <Logo className="h-6 w-auto" />
        <SignOutButton />
      </header>
      {children}
    </div>
  );
}
