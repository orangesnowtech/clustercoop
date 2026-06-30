import { requireRole } from "@/lib/auth/session";
import { getClientKyc } from "@/lib/kyc/queries";
import { getClientProfile } from "@/lib/clients/profile";
import { listClientDocuments } from "@/lib/documents/storage";
import { AccountSection } from "@/components/profile/AccountSection";
import { DocumentsManager } from "@/components/profile/DocumentsManager";
import { MetamapButton } from "@/components/kyc/MetamapButton";
import { DownloadStatementButton } from "@/components/statement/DownloadStatementButton";

const KYC_COPY: Record<string, { title: string; body: string; tone: string }> = {
  pending: {
    title: "Verify your identity",
    body: "Complete a quick identity check (government ID + a selfie) to start depositing, investing and withdrawing.",
    tone: "text-ink-soft",
  },
  in_review: {
    title: "Verification under review",
    body: "Your verification was received and is being reviewed by our Compliance team.",
    tone: "text-pending",
  },
  approved: {
    title: "Identity verified",
    body: "You're all set. Deposits, investments and withdrawals are enabled.",
    tone: "text-credit",
  },
  rejected: {
    title: "Verification unsuccessful",
    body: "Your verification could not be approved. Please try again or contact support.",
    tone: "text-debit",
  },
};

export default async function ProfilePage() {
  const user = await requireRole(["customer"]);
  const [kyc, documents, profile] = await Promise.all([
    getClientKyc(user.uid),
    listClientDocuments(user.uid),
    getClientProfile(user.uid),
  ]);
  const copy = KYC_COPY[kyc.kycStatus] ?? KYC_COPY.pending;
  const showButton = kyc.kycStatus === "pending" || kyc.kycStatus === "rejected";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Profile</h1>
      <p className="mb-8 text-sm text-ink-soft">Your account, identity and documents.</p>

      <div className="flex flex-col gap-6">
        <AccountSection email={user.email} memberSince={null} />

        {profile && (
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">
              Personal details
            </h2>
            <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-sm">
              <dt className="text-ink-soft">Name</dt>
              <dd className="text-ink">
                {[profile.firstName, profile.middleName, profile.lastName]
                  .filter(Boolean)
                  .join(" ")}
              </dd>
              <dt className="text-ink-soft">Phone</dt>
              <dd className="text-ink">{profile.phone}</dd>
              <dt className="text-ink-soft">Address</dt>
              <dd className="text-ink">{profile.address}</dd>
              <dt className="text-ink-soft">Bank</dt>
              <dd className="text-ink">
                {profile.bank?.bankName} · ••••{profile.bank?.accountNumber?.slice(-4)} ·{" "}
                {profile.bank?.accountName}
              </dd>
            </dl>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">
            Identity verification
          </h2>
          <p className={"font-medium " + copy.tone}>{copy.title}</p>
          <p className="mt-1 mb-4 text-sm text-ink-soft">{copy.body}</p>
          {kyc.kycStatus === "rejected" && kyc.rejectionReason && (
            <p className="mb-4 rounded-lg bg-debit/10 px-3 py-2 text-sm text-debit">
              Reason: {kyc.rejectionReason}
            </p>
          )}
          {showButton && <MetamapButton />}
        </section>

        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-ink">Documents</h2>

          <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <p className="text-sm font-medium text-ink">Account statement</p>
              <p className="text-xs text-ink-soft">Your full transaction history (PDF).</p>
            </div>
            <DownloadStatementButton uid={user.uid} />
          </div>

          <h3 className="mb-3 text-sm font-medium text-ink">Your uploads</h3>
          <DocumentsManager uid={user.uid} documents={documents} />
        </section>
      </div>
    </main>
  );
}
