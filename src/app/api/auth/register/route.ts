/**
 * Register route — finalize a brand-new customer account.
 *
 * The client creates the Firebase Auth user, then calls this with the ID token.
 * We set the `customer` custom claim (role is ALWAYS customer here — never
 * client-chosen) and create the client's Firestore doc. Staff roles and
 * superadmin are assigned out-of-band, never through this endpoint.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function POST(req: Request) {
  let idToken: unknown;
  try {
    ({ idToken } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (typeof idToken !== "string") {
    return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);

    // Never overwrite an existing role (e.g. a staff member re-authenticating).
    if (decoded.role) {
      return NextResponse.json({ role: decoded.role });
    }

    await getAdminAuth().setCustomUserClaims(decoded.uid, { role: "customer" });

    await getAdminDb()
      .collection("clients")
      .doc(decoded.uid)
      .set(
        {
          uid: decoded.uid,
          email: decoded.email ?? null,
          rmUid: null,
          kycStatus: "pending",
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

    return NextResponse.json({ role: "customer" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
