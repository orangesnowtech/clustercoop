import { redirect } from "next/navigation";

// Documents moved into the Profile hub.
export default function DocumentsRedirect() {
  redirect("/dashboard/profile");
}
