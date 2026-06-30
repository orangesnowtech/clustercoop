"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytes, deleteObject } from "firebase/storage";
import { getStorageClient } from "@/lib/firebase/client";
import type { ClientDocument } from "@/lib/documents/storage";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const MAX_BYTES = 10 * 1024 * 1024;

export function DocumentsManager({
  uid,
  documents,
}: {
  uid: string;
  documents: ClientDocument[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError("File must be under 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const id =
        (globalThis.crypto?.randomUUID?.() ?? String(Date.now())) +
        "_" +
        file.name.replace(/[^\w.-]/g, "_");
      const objectRef = ref(getStorageClient(), `client-documents/${uid}/${id}`);
      await uploadBytes(objectRef, file, {
        customMetadata: { displayName: file.name },
      });
      router.refresh();
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(path: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteObject(ref(getStorageClient(), path));
      router.refresh();
    } catch {
      setError("Could not delete. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {documents.length === 0 ? (
        <p className="text-sm text-ink-soft">No documents uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-border/60 text-sm">
          {documents.map((d) => (
            <li key={d.path} className="flex items-center justify-between gap-3 py-2">
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-coffee hover:underline"
              >
                {d.name}
              </a>
              <div className="flex items-center gap-3">
                <span className="font-figures text-xs text-ink-soft">
                  {fmtSize(d.sizeBytes)}
                </span>
                <button
                  onClick={() => remove(d.path)}
                  disabled={busy}
                  className="text-xs text-debit hover:underline disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div>
        <input
          ref={inputRef}
          type="file"
          onChange={onPick}
          disabled={busy}
          className="block text-sm text-ink-soft file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-primary-pressed"
        />
        {busy && <p className="mt-2 text-sm text-ink-soft">Uploading…</p>}
        {error && <p className="mt-2 text-sm text-debit">{error}</p>}
      </div>
    </div>
  );
}
