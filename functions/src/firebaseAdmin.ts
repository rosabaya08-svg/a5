import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function getAdminDb() {
  if (getApps().length === 0) {
    initializeApp();
  }

  return getFirestore();
}

export function getAdminAuth() {
  if (getApps().length === 0) {
    initializeApp();
  }

  return getAuth();
}
