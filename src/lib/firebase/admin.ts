/**
 * Firebase Admin SDK (SERVER-ONLY).
 *
 * Built from FIREBASE_SERVICE_ACCOUNT (no NEXT_PUBLIC_ prefix). This module
 * must NEVER be imported into a Client Component or shipped to the browser —
 * it holds full admin credentials. Import only from Server Components, Route
 * Handlers, Server Actions, and middleware/proxy.
 *
 * Initialization is LAZY: the service account is only read when a getter is
 * first called at runtime, so importing this module during `next build` (page
 * data collection) does not require the secret to be present.
 */
import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

/** Explicit service-account credential (env JSON or local file), or null. */
function getExplicitServiceAccount(): ServiceAccount | null {
  // Priority 1: the env var (a way to supply credentials explicitly).
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      return JSON.parse(raw) as ServiceAccount;
    } catch {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Store the service account " +
          "key as a single-line JSON string.",
      );
    }
  }
  // Priority 2 (local dev): a gitignored firebaseServiceAccountKey.json.
  try {
    const file = join(process.cwd(), "firebaseServiceAccountKey.json");
    return JSON.parse(readFileSync(file, "utf8")) as ServiceAccount;
  } catch {
    return null;
  }
}

function getAdminApp(): App {
  if (getApps().length) return getApp();
  const explicit = getExplicitServiceAccount();
  // Explicit creds locally; Application Default Credentials on App Hosting
  // (the runtime service account has Firebase access — no key to embed).
  return explicit
    ? initializeApp({ credential: cert(explicit) })
    : initializeApp();
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
