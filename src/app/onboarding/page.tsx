import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { isOnboarded } from "@/lib/clients/profile";
import { listBanks } from "@/lib/api/paystack";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const user = await requireRole(["customer"]);
  if (await isOnboarded(user.uid)) redirect("/dashboard");
  const banks = await listBanks();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Welcome — let&apos;s set up your account
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        We need a few details to comply with regulations before you can transact.
        You&apos;ll verify your identity right after.
      </p>
      <div className="rounded-2xl border border-border bg-white p-6">
        <OnboardingForm banks={banks} />
      </div>
    </main>
  );
}
