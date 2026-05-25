import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const defaultProjectId = "a5-closed-mall";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? defaultProjectId}.firebaseapp.com`,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? defaultProjectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? defaultProjectId}.firebasestorage.app`,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export type FirebaseRuntimeStatus = {
  configured: boolean;
  projectId: string;
  storageBucket: string;
  missing: string[];
};

export function getFirebaseRuntimeStatus(): FirebaseRuntimeStatus {
  const missing = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", firebaseConfig.apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", firebaseConfig.authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", firebaseConfig.projectId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", firebaseConfig.appId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    configured: missing.length === 0,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    missing,
  };
}

export function getFirebaseApp(): FirebaseApp | null {
  if (!getFirebaseRuntimeStatus().configured) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAuthClient(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export async function ensureAnonymousFirebaseUser() {
  const auth = getFirebaseAuthClient();

  if (!auth) {
    return null;
  }

  if (auth.currentUser) {
    return auth.currentUser;
  }

  const credential = await signInAnonymously(auth);
  return credential.user;
}
