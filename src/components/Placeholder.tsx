/** Thin stub body for not-yet-built pages — keeps nav functional. */
export function Placeholder({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <h1 className="mb-2 font-display text-2xl font-semibold text-ink">
        {title}
      </h1>
      <p className="mb-8 text-sm text-ink-soft">
        {description ?? "Coming soon."}
      </p>
      <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center text-ink-soft">
        This section is not built yet.
      </div>
    </main>
  );
}
