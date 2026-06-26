export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <span className="inline-flex h-2 w-2 rounded-full bg-primary" aria-hidden />
      <h1 className="font-display text-5xl font-bold tracking-tight text-ink">
        cluster
      </h1>
      <p className="max-w-md text-ink-soft">
        Client investment portal and double-entry accounting ledger.
      </p>
      <p className="font-figures text-sm text-coffee">
        Scaffolding complete · ledger core next
      </p>
    </main>
  );
}
