/** Submit onboarding KYC profile. Customer only. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { LedgerError } from "@/lib/ledger/types";
import { saveOnboarding } from "@/lib/clients/profile";
import type { ClientProfileInput } from "@/lib/onboarding/validate";

export async function POST(req: Request) {
  const { user, error } = await apiRequireRole(["customer"]);
  if (error) return error;

  let body: ClientProfileInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    await saveOnboarding(user.uid, body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof LedgerError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}
