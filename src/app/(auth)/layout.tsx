import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8" aria-label="Cluster home">
        <Logo className="h-9 w-auto" priority />
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
