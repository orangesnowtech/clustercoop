import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { canViewClient } from "@/lib/clients/access";
import { getClientProfile } from "@/lib/clients/profile";
import { getClientKyc } from "@/lib/kyc/queries";
import { fetchMetamapVerification } from "@/lib/api/metamap";
import { KycReviewActions } from "@/components/kyc/KycReviewActions";

function Row({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right text-ink">{value || "—"}</span>
    </div>
  );
}

export default async function KycReviewDetail({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  const user = await requireRole(["superadmin", "admin", "compliance"]);
  if (!(await canViewClient(user, uid))) notFound();

  const [profile, kyc] = await Promise.all([getClientProfile(uid), getClientKyc(uid)]);
  const metamap = await fetchMetamapVerification(kyc.metamapResource);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      <Link href="/admin/kyc" className="text-sm text-coffee hover:underline">
        ← KYC review
      </Link>
      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Verify identity</h1>
          <p className="text-sm text-ink-soft">
            MetaMap verdict:{" "}
            <span className="font-medium">{kyc.metamapVerdict ?? "—"}</span> · status{" "}
            {kyc.kycStatus}
          </p>
        </div>
        {kyc.kycStatus === "in_review" && <KycReviewActions uid={uid} />}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Customer-submitted details */}
        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">Submitted by client</h2>
          {profile ? (
            <div className="divide-y divide-border/60">
              <Row
                label="Name"
                value={[profile.firstName, profile.middleName, profile.lastName]
                  .filter(Boolean)
                  .join(" ")}
              />
              <Row label="Phone" value={profile.phone} />
              <Row label="Address" value={profile.address} />
              <Row label="NIN" value={profile.nin} />
              <Row label="BVN" value={profile.bvn} />
              <Row label="Bank" value={profile.bank?.bankName} />
              <Row label="Account no." value={profile.bank?.accountNumber} />
              <Row label="Account name" value={profile.bank?.accountName} />
            </div>
          ) : (
            <p className="text-sm text-ink-soft">No onboarding details submitted.</p>
          )}
        </section>

        {/* MetaMap extracted data */}
        <section className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-ink">From MetaMap</h2>
          {metamap && metamap.fields.length > 0 ? (
            <div className="divide-y divide-border/60">
              {metamap.fields.map((f, i) => (
                <Row key={i} label={f.label} value={f.value} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              MetaMap data unavailable. Set <code>METAMAP_CLIENT_SECRET</code> and ensure
              a completed verification, or cross-check in the MetaMap dashboard.
            </p>
          )}
        </section>
      </div>

      <p className="mt-6 text-xs text-ink-soft">
        Confirm the submitted details match the verified identity before approving.
      </p>
    </main>
  );
}
