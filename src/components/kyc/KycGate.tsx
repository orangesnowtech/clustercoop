import Link from "next/link";
import type { KycStatus } from "@/lib/kyc/types";

/**
 * UX cue shown on transactional pages when the customer isn't KYC-approved.
 * Enforcement is server-side (assertCanDeposit / assertCanWithdraw); this just
 * directs the user to verification. Renders nothing when approved.
 */
export function KycGate({ status }: { status: KycStatus }) {
  if (status === "approved") return null;

  const message =
    status === "in_review"
      ? "Your identity verification is under review. You can transact once it's approved."
      : "Verify your identity to deposit or withdraw.";

  return (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-pending/30 bg-pending/10 px-5 py-4">
      <p className="text-sm text-ink">{message}</p>
      {status !== "in_review" && (
        <Link
          href="/dashboard/verify"
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-ink transition hover:bg-primary-pressed"
        >
          Verify now
        </Link>
      )}
    </div>
  );
}
