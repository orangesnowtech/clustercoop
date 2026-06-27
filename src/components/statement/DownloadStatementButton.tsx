/** Link to the scoped PDF export route for a given client uid. */
export function DownloadStatementButton({ uid }: { uid: string }) {
  return (
    <a
      href={`/api/statements/${uid}/pdf`}
      className="inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-ink transition hover:bg-primary-pressed"
    >
      Download PDF
    </a>
  );
}
