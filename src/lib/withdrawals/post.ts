/**
 * Withdrawal post (SERVER-ONLY) — the Accounts step that moves the ledger.
 * Asserts the request is approved, then posts DR 2000:<uid> / CR 1000 with a
 * sufficiency precondition so the client can never overdraw, idempotent via
 * withdrawalKey. Mirrors recordVerifiedDeposit (post then tx-guarded markPosted;
 * a crash in between self-heals on retry via ledger idempotency).
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { postEntry } from "@/lib/ledger/post";
import { withdrawalKey } from "@/lib/ledger/idempotency";
import { ensureClientAccounts } from "@/lib/ledger/accounts";
import { clientSubAccountId } from "@/lib/ledger/chart";
import { LedgerError } from "@/lib/ledger/types";
import type { Role } from "@/lib/roles";
import { buildWithdrawalLines } from "./lines";
import { WITHDRAWALS_COLLECTION } from "./queries";
import type { WithdrawalDoc } from "./types";

export interface PostWithdrawalResult {
  entryId: string;
  replay: boolean;
}

export async function postWithdrawal(
  id: string,
  actor: { uid: string; role: Role },
): Promise<PostWithdrawalResult> {
  const db = getAdminDb();
  const ref = db.collection(WITHDRAWALS_COLLECTION).doc(id);

  const snap = await ref.get();
  if (!snap.exists) throw new LedgerError("unknown_withdrawal", "Withdrawal not found.");
  const wd = snap.data() as WithdrawalDoc;

  if (wd.status === "posted" && wd.entryId) {
    return { entryId: wd.entryId, replay: true }; // idempotent fast path
  }
  if (wd.status !== "approved") {
    throw new LedgerError(
      "bad_status",
      `Withdrawal is '${wd.status}', must be 'approved' to post.`,
    );
  }

  await ensureClientAccounts(wd.uid);

  const postedDate = new Date().toISOString().slice(0, 10);
  const result = await postEntry({
    idempotencyKey: withdrawalKey(id),
    type: "withdrawal",
    reference: { source: "withdrawal", id },
    memo: `Withdrawal ${id}`,
    postedDate,
    createdBy: actor.uid,
    createdByRole: actor.role,
    lines: buildWithdrawalLines(wd.amountKobo, wd.uid),
    // Authoritative overdraw guard: client's liability balance must cover it.
    preconditions: [
      { accountId: clientSubAccountId(wd.uid), minBalanceKobo: wd.amountKobo },
    ],
  });

  await markPosted(id, { entryId: result.entryId, postedBy: actor.uid });
  return { entryId: result.entryId, replay: result.idempotentReplay };
}

async function markPosted(
  id: string,
  data: { entryId: string; postedBy: string },
): Promise<void> {
  const db = getAdminDb();
  const ref = db.collection(WITHDRAWALS_COLLECTION).doc(id);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.data() as WithdrawalDoc | undefined;
    if (cur?.status === "posted" && cur.entryId) return; // already converged
    tx.update(ref, {
      status: "posted",
      entryId: data.entryId,
      postedBy: data.postedBy,
      postedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}
