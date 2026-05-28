import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInAnonymously, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { initializeFirebaseAppCheck } from "@/lib/firebase/appCheck";

const defaultProjectId = "a5-closed-mall";
const defaultFirebasePublicConfig = {
  apiKey: "AIzaSyCVZXG1uM3NS09AeQf08UQNOw-SZ_a5RYE",
  authDomain: "a5-closed-mall.firebaseapp.com",
  projectId: defaultProjectId,
  storageBucket: "a5-closed-mall.firebasestorage.app",
  messagingSenderId: "954291596226",
  appId: "1:954291596226:web:1307d2c2f8fa25229d845b",
  measurementId: "G-TZJBLJLK0Y",
};

function publicEnv(name: string, fallback: string) {
  return process.env[name]?.trim() || fallback;
}

const firebaseConfig = {
  apiKey: publicEnv("NEXT_PUBLIC_FIREBASE_API_KEY", defaultFirebasePublicConfig.apiKey),
  authDomain: publicEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", defaultFirebasePublicConfig.authDomain),
  projectId: publicEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", defaultFirebasePublicConfig.projectId),
  storageBucket: publicEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", defaultFirebasePublicConfig.storageBucket),
  messagingSenderId: publicEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", defaultFirebasePublicConfig.messagingSenderId),
  appId: publicEnv("NEXT_PUBLIC_FIREBASE_APP_ID", defaultFirebasePublicConfig.appId),
  measurementId: publicEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", defaultFirebasePublicConfig.measurementId),
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

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  initializeFirebaseAppCheck(app);
  return app;
}

export function getFirebaseDb(): Firestore | null {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAuthClient(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

export function getFirebaseStorageClient(): FirebaseStorage | null {
  const app = getFirebaseApp();
  return app ? getStorage(app, `gs://${firebaseConfig.storageBucket}`) : null;
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
