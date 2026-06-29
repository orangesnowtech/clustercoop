import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo className="h-14 w-auto" priority />
      <p className="max-w-md text-ink-soft">
        Client investment portal and double-entry accounting ledger.
      </p>
      <p className="font-figures text-sm text-coffee">
        Scaffolding complete · ledger core next
      </p>
    </main>
  );
}
