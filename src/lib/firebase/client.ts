/**
 * Firebase client SDK (browser-safe).
 *
 * Built from the six NEXT_PUBLIC_FIREBASE_* vars — browser-safe and baked into
 * the bundle at build time. NEVER import the Admin SDK or a service account
 * here; this module runs in the browser.
 *
 * Initialization is LAZY via getters so that getAuth()/getFirestore() are only
 * called in the browser (inside effects / event handlers), never during SSR or
 * static prerender where the public env vars may be absent.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getClientApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getClientApp());
}

export function getDb(): Firestore {
  return getFirestore(getClientApp());
}

export function getStorageClient(): FirebaseStorage {
  return getStorage(getClientApp());
}
