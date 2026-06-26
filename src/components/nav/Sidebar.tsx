"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/lib/nav";

export function Sidebar({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        // Exact match for index routes, prefix match for sections.
        const isIndex = item.href === "/dashboard" || item.href === "/admin";
        const active = isIndex
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-lg px-3 py-2 text-sm transition " +
              (active
                ? "bg-primary/10 font-medium text-ink"
                : "text-ink-soft hover:bg-surface hover:text-ink")
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
