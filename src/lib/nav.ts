/**
 * Navigation model — role-aware menus.
 *
 * Each item lists the roles permitted to *see* it. The sidebar filters by the
 * signed-in user's role; the destination page still enforces access via
 * requireRole (visibility is not authorization). superadmin/admin see all.
 */
import type { Role } from "@/lib/roles";

export interface NavItem {
  label: string;
  href: string;
  /** Roles that may see this item. */
  roles: Role[];
}

const ALL_STAFF: Role[] = [
  "superadmin",
  "admin",
  "compliance",
  "accounts",
  "rm",
];

/** Customer portal nav — every item is customer-only. */
export const CUSTOMER_NAV: NavItem[] = [
  { label: "Portfolio", href: "/dashboard", roles: ["customer"] },
  { label: "Statements", href: "/dashboard/statements", roles: ["customer"] },
  { label: "Transactions", href: "/dashboard/transactions", roles: ["customer"] },
  { label: "Deposit", href: "/dashboard/deposit", roles: ["customer"] },
  { label: "Withdraw", href: "/dashboard/withdraw", roles: ["customer"] },
  { label: "Documents", href: "/dashboard/documents", roles: ["customer"] },
  { label: "Profile", href: "/dashboard/profile", roles: ["customer"] },
];

/** Back-office nav — gated per staff sub-role. */
export const STAFF_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", roles: ALL_STAFF },
  {
    label: "Investors",
    href: "/admin/investors",
    roles: ["superadmin", "admin", "accounts", "compliance", "rm"],
  },
  {
    label: "KYC Review",
    href: "/admin/kyc",
    roles: ["superadmin", "admin", "compliance"],
  },
  {
    label: "Ledger",
    href: "/admin/ledger",
    roles: ["superadmin", "admin", "accounts"],
  },
  {
    label: "Deposits",
    href: "/admin/deposits",
    roles: ["superadmin", "admin", "accounts"],
  },
  {
    label: "Withdrawals",
    href: "/admin/withdrawals",
    roles: ["superadmin", "admin", "accounts", "compliance"],
  },
  {
    label: "Products",
    href: "/admin/products",
    roles: ["superadmin", "admin", "accounts"],
  },
  {
    label: "Valuations",
    href: "/admin/valuations",
    roles: ["superadmin", "admin", "accounts"],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    roles: ["superadmin", "admin", "accounts", "compliance"],
  },
];

export function navItemsFor(role: Role | undefined): NavItem[] {
  if (!role) return [];
  const source = role === "customer" ? CUSTOMER_NAV : STAFF_NAV;
  return source.filter((item) => item.roles.includes(role));
}
