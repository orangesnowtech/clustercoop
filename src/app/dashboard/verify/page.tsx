import { redirect } from "next/navigation";

// Identity verification moved into the Profile hub.
export default function VerifyRedirect() {
  redirect("/dashboard/profile");
}
