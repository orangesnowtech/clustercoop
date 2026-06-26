// Emulator test setup. Imported FIRST by every emulator test so the default
// firebase-admin app is initialized (projectId only, no real credentials)
// before any ledger code calls getAdminDb(). `firebase emulators:exec` sets
// FIRESTORE_EMULATOR_HOST; default it for safety.
import { initializeApp, getApps } from "firebase-admin/app";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}

export const PROJECT_ID = "demo-cluster";

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

/** Wipe all Firestore data in the emulator (via its REST endpoint). */
export async function clearEmulator(): Promise<void> {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  await fetch(
    `http://${host}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}
