/**
 * Client profile (SERVER-ONLY) — the customer's onboarding KYC details stored
 * on clients/{uid}. The verified bank here is the ONLY destination withdrawals
 * may pay out to.
 */
import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { validateOnboarding, type ClientProfileInput, type BankDetails } from "@/lib/onboarding/validate";

export async function saveOnboarding(uid: string, input: ClientProfileInput): Promise<void> {
  const profile = validateOnboarding(input);
  await getAdminDb()
    .collection("clients")
    .doc(uid)
    .set(
      { profile, onboardedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
}

export async function getClientProfile(uid: string): Promise<ClientProfileInput | null> {
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  return (snap.data()?.profile as ClientProfileInput) ?? null;
}

export async function isOnboarded(uid: string): Promise<boolean> {
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  return Boolean(snap.data()?.onboardedAt);
}

/** The single verified bank account withdrawals must pay out to. */
export async function getVerifiedBank(uid: string): Promise<BankDetails | null> {
  const profile = await getClientProfile(uid);
  return profile?.bank ?? null;
}
