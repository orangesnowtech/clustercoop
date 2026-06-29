import { requireRole } from "@/lib/auth/session";
import { getClientKyc } from "@/lib/kyc/queries";
import { MetamapButton } from "@/components/kyc/MetamapButton";

const COPY: Record<string, { title: string; body: string; tone: string }> = {
  pending: {
    title: "Verify your identity",
    body: "Complete a quick identity check (government ID + a selfie) to start depositing and withdrawing.",
    tone: "text-ink-soft",
  },
  in_review: {
    title: "Verification under review",
    body: "Thanks — your verification was received and is being reviewed by our Compliance team. We'll update your status shortly.",
    tone: "text-pending",
  },
  approved: {
    title: "Identity verified",
    body: "You're all set. Deposits and withdrawals are enabled.",
    tone: "text-credit",
  },
  rejected: {
    title: "Verification unsuccessful",
    body: "Your verification could not be approved. Please try again or contact support.",
    tone: "text-debit",
  },
};

export default async function VerifyPage() {
  const user = await requireRole(["customer"]);
  const kyc = await getClientKyc(user.uid);
  const copy = COPY[kyc.kycStatus] ?? COPY.pending;
  const showButton = kyc.kycStatus === "pending" || kyc.kycStatus === "rejected";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        Identity verification
      </h1>
      <p className="mb-8 text-sm text-ink-soft">Required before you can transact.</p>

      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className={"font-display text-lg font-semibold " + copy.tone}>
          {copy.title}
        </h2>
        <p className="mt-1 mb-4 text-sm text-ink-soft">{copy.body}</p>
        {kyc.kycStatus === "rejected" && kyc.rejectionReason && (
          <p className="mb-4 rounded-lg bg-debit/10 px-3 py-2 text-sm text-debit">
            Reason: {kyc.rejectionReason}
          </p>
        )}
        {showButton && <MetamapButton />}
      </section>
    </main>
  );
}
