/** Start a KYC session: mint the nonce that binds the verification to this user. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { startKycSession } from "@/lib/kyc/session";
import { metamapPublicConfig } from "@/lib/api/metamap";

export async function POST() {
  const { user, error } = await apiRequireRole(["customer"]);
  if (error) return error;

  const { nonce } = await startKycSession(user.uid);
  return NextResponse.json({ nonce, ...metamapPublicConfig() });
}
