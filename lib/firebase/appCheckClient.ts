"use client";

import { ReCaptchaV3Provider, getToken, initializeAppCheck, type AppCheck } from "firebase/app-check";
import { getFirebaseApp } from "@/lib/firebase/client";

declare global {
  var __A5_FIREBASE_APP_CHECK__: AppCheck | null | undefined;
}

function getAppCheckClient() {
  if (globalThis.__A5_FIREBASE_APP_CHECK__ !== undefined) return globalThis.__A5_FIREBASE_APP_CHECK__;
  const app = getFirebaseApp();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY?.trim() ?? "";
  if (!app || !siteKey || typeof window === "undefined") {
    globalThis.__A5_FIREBASE_APP_CHECK__ = null;
    return globalThis.__A5_FIREBASE_APP_CHECK__;
  }
  try {
    globalThis.__A5_FIREBASE_APP_CHECK__ = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    globalThis.__A5_FIREBASE_APP_CHECK__ = null;
  }
  return globalThis.__A5_FIREBASE_APP_CHECK__;
}

export async function getFirebaseAppCheckToken() {
  const appCheck = getAppCheckClient();
  if (!appCheck) return "";
  try {
    return (await getToken(appCheck, false)).token;
  } catch {
    return "";
  }
}
