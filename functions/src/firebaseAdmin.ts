import { getApp, initializeApp, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

function getDefaultAdminApp(): App {
  try {
    return getApp();
  } catch {
    return initializeApp();
  }
}

export function getAdminDb() {
  return getFirestore(getDefaultAdminApp());
}

export function getAdminAuth() {
  return getAuth(getDefaultAdminApp());
}

export function getAdminStorage() {
  return getStorage(getDefaultAdminApp());
}

export function getAdminDbForProject(appName: string, projectId: string) {
  const existing = getApps().find((app) => app.name === appName);
  const app = existing ?? initializeApp({ projectId }, appName);
  return getFirestore(app);
}
