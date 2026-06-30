/**
 * Client documents (SERVER-ONLY). Files live in Cloud Storage under
 * client-documents/<uid>/. Listing happens here via the Admin SDK (signed
 * read URLs), so staff can view a client's docs without client-side Storage
 * permissions (gated upstream by canViewClient). Uploads/deletes are
 * client-side, owner-only (see storage.rules).
 */
import "server-only";
import { getAdminStorage } from "@/lib/firebase/admin";

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

export interface ClientDocument {
  name: string; // original filename
  path: string; // full storage object path
  url: string; // signed read URL
  sizeBytes: number;
  uploadedAt: string; // ISO timestamp
}

export function clientDocumentsPrefix(uid: string): string {
  return `client-documents/${uid}/`;
}

export async function listClientDocuments(uid: string): Promise<ClientDocument[]> {
  if (!BUCKET) return [];
  try {
    const bucket = getAdminStorage().bucket(BUCKET);
    const [files] = await bucket.getFiles({ prefix: clientDocumentsPrefix(uid) });
    const docs = await Promise.all(
      files.map(async (f) => {
        const [meta] = await f.getMetadata();
        const [url] = await f.getSignedUrl({
          action: "read",
          expires: Date.now() + 60 * 60 * 1000, // 1h
        });
        const name =
          (meta.metadata?.displayName as string | undefined) ??
          f.name.split("/").pop() ??
          f.name;
        return {
          name,
          path: f.name,
          url,
          sizeBytes: Number(meta.size ?? 0),
          uploadedAt: meta.timeCreated ?? "",
        };
      }),
    );
    return docs.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
  } catch {
    // Storage not enabled / unreachable — render an empty list gracefully.
    return [];
  }
}
