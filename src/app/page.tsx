import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { homeForRole } from "@/lib/auth/routes";

/**
 * Landing → login. Until the public (Sanity) marketing site exists, the root
 * sends visitors to sign in; already-authenticated users go to their area.
 */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homeForRole(user.role) : "/login");
}
