"use client";

import { ReCaptchaV3Provider, getAppCheck, getToken, initializeAppCheck, type AppCheck } from "firebase/app-check";
import { getFirebaseApp } from "@/lib/firebase/client";

let instance: AppCheck | null | undefined;

function getAppCheckClient() {
  if (instance !== undefined) return instance;
  const app = getFirebaseApp();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY?.trim() ?? "";
  if (!app || !siteKey || typeof window === "undefined") {
    instance = null;
    return instance;
  }
  try {
    instance = getAppCheck(app);
  } catch {
    try {
      instance = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch {
      instance = null;
    }
  }
  return instance;
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
