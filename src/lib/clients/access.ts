/**
 * Client access — who may view a given client's data. The pure
 * `decideClientAccess` matrix is unit-tested; the server wrappers read the
 * client doc for RM scoping (rm sees only clients where rmUid == their uid).
 */
import "server-only";
import { getAdminDb } from "@/lib/firebase/admin";
import type { Role } from "@/lib/roles";
import type { SessionUser } from "@/lib/auth/session";

/** Staff roles that can view ANY client (no RM scoping). */
const UNSCOPED_STAFF: Role[] = ["superadmin", "admin", "accounts", "compliance"];

/** PURE access decision. `rmMatches` = (role is rm AND client.rmUid == user.uid). */
export function decideClientAccess(
  role: Role | undefined,
  isSelf: boolean,
  rmMatches: boolean,
): boolean {
  if (isSelf) return true;
  if (!role) return false;
  if (UNSCOPED_STAFF.includes(role)) return true;
  if (role === "rm") return rmMatches;
  return false; // customers: only themselves (handled by isSelf)
}

export interface ClientDoc {
  uid: string;
  email: string | null;
  rmUid: string | null;
  kycStatus: string | null;
}

export async function getClient(uid: string): Promise<ClientDoc | null> {
  const snap = await getAdminDb().collection("clients").doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data()!;
  return {
    uid,
    email: d.email ?? null,
    rmUid: d.rmUid ?? null,
    kycStatus: d.kycStatus ?? null,
  };
}

/** May `user` view `clientUid`'s statement? Reads rmUid only for the rm case. */
export async function canViewClient(
  user: SessionUser,
  clientUid: string,
): Promise<boolean> {
  const isSelf = user.uid === clientUid;
  if (isSelf) return true;
  if (user.role === "rm") {
    const client = await getClient(clientUid);
    return decideClientAccess("rm", false, client?.rmUid === user.uid);
  }
  return decideClientAccess(user.role, false, false);
}

/** Clients visible to a staff member (rm → assigned only; others → all). */
export async function listClientsForStaff(user: SessionUser): Promise<ClientDoc[]> {
  const col = getAdminDb().collection("clients");
  const query =
    user.role === "rm" ? col.where("rmUid", "==", user.uid) : col;
  const snap = await query.get();
  return snap.docs.map((doc) => {
    const d = doc.data();
    return {
      uid: doc.id,
      email: d.email ?? null,
      rmUid: d.rmUid ?? null,
      kycStatus: d.kycStatus ?? null,
    };
  });
}
