/** Seed the chart of accounts. Admin/superadmin only. */
import { NextResponse } from "next/server";
import { apiRequireRole } from "@/lib/auth/api";
import { seedChart } from "@/lib/ledger/accounts";

export async function POST() {
  const { error } = await apiRequireRole(["superadmin", "admin"]);
  if (error) return error;
  const result = await seedChart();
  return NextResponse.json(result);
}
