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

function getServiceAccount(): ServiceAccount {
  // Priority 1: the env var (how production/App Hosting supplies it).
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

  // Priority 2 (local dev only): a gitignored firebaseServiceAccountKey.json
  // at the project root. Never present in production.
  try {
    const file = join(process.cwd(), "firebaseServiceAccountKey.json");
    return JSON.parse(readFileSync(file, "utf8")) as ServiceAccount;
  } catch {
    throw new Error(
      "No Firebase admin credentials found. Set FIREBASE_SERVICE_ACCOUNT " +
        "(Secret Manager / env) or place firebaseServiceAccountKey.json at the " +
        "project root for local dev. It must never be NEXT_PUBLIC_.",
    );
  }
}

function getAdminApp(): App {
  return getApps().length
    ? getApp()
    : initializeApp({ credential: cert(getServiceAccount()) });
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
