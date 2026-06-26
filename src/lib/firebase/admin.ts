/**
 * Firebase Admin SDK (SERVER-ONLY).
 *
 * Built from FIREBASE_SERVICE_ACCOUNT (no NEXT_PUBLIC_ prefix). This module
 * must NEVER be imported into a Client Component or shipped to the browser —
 * it holds full admin credentials. Import only from Server Components, Route
 * Handlers, Server Actions, and middleware.
 */
import "server-only";
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
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set. Add it to .env.local (local) or " +
        "Secret Manager (App Hosting). It must never be NEXT_PUBLIC_.",
    );
  }
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Store the service account " +
        "key as a single-line JSON string.",
    );
  }
}

const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(getServiceAccount()) });

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
export const adminStorage: Storage = getStorage(adminApp);
export { adminApp };
