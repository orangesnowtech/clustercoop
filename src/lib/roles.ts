/**
 * Roles — the single source of truth for Cluster's six roles.
 *
 * Roles live as Firebase Auth CUSTOM CLAIMS, never in Firestore. This file
 * defines the claim values, display names and coarse permissions; middleware,
 * page guards, nav and Firestore rules all read from here.
 *
 * Separation of duties (withdrawals): customer requests → compliance approves
 * → accounts posts to the ledger.
 */

export const ROLES = [
  "superadmin",
  "admin",
  "compliance",
  "accounts",
  "rm",
  "customer",
] as const;

export type Role = (typeof ROLES)[number];

export interface RoleDef {
  claim: Role;
  label: string;
  /** Can write to the double-entry ledger (post journal entries). */
  canPostLedger: boolean;
  /** Limited to assigned clients only (enforced via rmUid + Firestore rules). */
  assignedClientsOnly: boolean;
  notes: string;
}

export const ROLE_DEFS: Record<Role, RoleDef> = {
  superadmin: {
    claim: "superadmin",
    label: "Super Admin",
    canPostLedger: true,
    assignedClientsOnly: false,
    notes: "Set manually in Firebase Console only — never via app UI.",
  },
  admin: {
    claim: "admin",
    label: "Admin",
    canPostLedger: true,
    assignedClientsOnly: false,
    notes: "Full app, user management, all data, all back-office functions.",
  },
  compliance: {
    claim: "compliance",
    label: "Compliance",
    canPostLedger: false,
    assignedClientsOnly: false,
    notes: "Approve KYC, sign off withdrawals; read-only on ledger.",
  },
  accounts: {
    claim: "accounts",
    label: "Accounts",
    canPostLedger: true,
    assignedClientsOnly: false,
    notes: "Post journal entries, manage deposits/withdrawals, valuations.",
  },
  rm: {
    claim: "rm",
    label: "Relationship Manager",
    canPostLedger: false,
    assignedClientsOnly: true,
    notes: "Read-only, assigned clients only; assist onboarding.",
  },
  customer: {
    claim: "customer",
    label: "Customer",
    canPostLedger: false,
    assignedClientsOnly: false,
    notes: "Own data only.",
  },
};

/** Every staff/back-office role (i.e. everyone except customer). */
export const STAFF_ROLES: Role[] = [
  "superadmin",
  "admin",
  "compliance",
  "accounts",
  "rm",
];

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function hasRole(role: unknown, allowed: readonly Role[]): boolean {
  return isRole(role) && allowed.includes(role);
}
