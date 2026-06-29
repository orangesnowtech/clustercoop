import { requireRole } from "@/lib/auth/session";
import { listKycInReview } from "@/lib/kyc/queries";
import { KycReviewActions } from "@/components/kyc/KycReviewActions";

const verdictStyles: Record<string, string> = {
  verified: "bg-credit/10 text-credit",
  reviewNeeded: "bg-pending/10 text-pending",
  rejected: "bg-debit/10 text-debit",
};

export default async function KycPage() {
  await requireRole(["superadmin", "admin", "compliance"]);
  const queue = await listKycInReview();

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        KYC Review
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        Identity checks (ID document + selfie/liveness) awaiting a compliance decision.
      </p>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {queue.length === 0 ? (
          <p className="p-8 text-center text-sm text-ink-soft">
            Nothing awaiting review.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface text-left text-xs uppercase text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">MetaMap verdict</th>
                <th className="px-4 py-3 font-medium">Verification</th>
                <th className="px-4 py-3 text-right font-medium">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {queue.map((c) => (
                <tr key={c.uid}>
                  <td className="px-4 py-3 text-ink">{c.email ?? c.uid}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-xs font-medium " +
                        (verdictStyles[c.metamapVerdict ?? ""] ?? "bg-surface text-ink-soft")
                      }
                    >
                      {c.metamapVerdict ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-figures text-xs text-ink-soft">
                    {c.verificationId ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <KycReviewActions uid={c.uid} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
