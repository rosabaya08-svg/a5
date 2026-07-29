"use client";

import { signInWithCustomToken, signOut, type IdTokenResult } from "firebase/auth";
import { getFirebaseAppCheckToken } from "@/lib/firebase/appCheckClient";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

export type TabletDeviceSession = {
  nurseryId: string;
  businessNo: string;
  businessName: string;
  registeredAddress?: string;
  roomId: string;
  roomName: string;
  tabletId: string;
  tabletLabel?: string;
  fixedLogin: true;
  updatedAt: string;
};

type ErrorBody = {
  message?: string;
  error?: string | { code?: string; message?: string };
};

function functionsBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ?? "").replace(/\/$/, "");
}

async function post<T>(functionName: string, payload: Record<string, unknown>, options: { auth?: boolean } = {}) {
  const baseUrl = functionsBaseUrl();
  if (!baseUrl) throw new Error("A5 Firebase Functions 주소가 설정되지 않았습니다.");
  const auth = getFirebaseAuthClient();
  const [idToken, appCheckToken] = await Promise.all([
    options.auth ? auth?.currentUser?.getIdToken(true) ?? Promise.resolve("") : Promise.resolve(""),
    getFirebaseAppCheckToken(),
  ]);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${baseUrl}/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await response.json()) as T & ErrorBody;
    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : body.error?.message ?? body.message ?? `HTTP ${response.status}`;
      throw new Error(message);
    }
    return body;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function enrollTabletDevice(input: { businessNumber: string; enrollmentCode: string }) {
  const auth = getFirebaseAuthClient();
  if (!auth) throw new Error("Firebase 태블릿 인증 설정이 없습니다.");
  const result = await post<{ ok: true; customToken: string; session: TabletDeviceSession }>("tabletDeviceEnroll", input);
  const credential = await signInWithCustomToken(auth, result.customToken);
  const token = await credential.user.getIdTokenResult(true);
  assertTabletClaims(token, result.session);
  return result.session;
}

export async function verifyTabletDeviceSession() {
  const auth = getFirebaseAuthClient();
  if (!auth?.currentUser) throw new Error("등록된 태블릿 Firebase 로그인이 없습니다.");
  const token = await auth.currentUser.getIdTokenResult(true);
  assertTabletClaims(token);
  const result = await post<{
    ok: true;
    session: { nurseryId: string; businessNo: string; roomId: string; tabletId: string; role: "TABLET_DEVICE"; accessStatus: "ACTIVE" };
  }>("tabletDeviceStatus", {}, { auth: true });
  return { token, status: result.session };
}

export async function logoutTabletDevice() {
  const auth = getFirebaseAuthClient();
  if (auth) await signOut(auth);
}

export function tabletClaims(token: IdTokenResult) {
  const roles = [token.claims.role, ...(Array.isArray(token.claims.roles) ? token.claims.roles : [])]
    .map((value) => String(value ?? "").trim().toUpperCase())
    .filter(Boolean);
  return {
    roles: [...new Set(roles)],
    accessStatus: String(token.claims.access_status ?? "").toUpperCase(),
    nurseryId: String(token.claims.nursery_id ?? ""),
    roomId: String(token.claims.room_id ?? ""),
    tabletId: String(token.claims.tablet_id ?? ""),
    businessNumber: String(token.claims.business_number ?? "").replace(/[^0-9]/g, ""),
  };
}

function assertTabletClaims(token: IdTokenResult, expected?: TabletDeviceSession) {
  const claims = tabletClaims(token);
  if (!claims.roles.includes("TABLET_DEVICE") || claims.accessStatus !== "ACTIVE") {
    throw new Error("활성 TABLET_DEVICE Firebase 권한이 없습니다.");
  }
  if (!claims.nurseryId || !claims.roomId || !claims.tabletId || !claims.businessNumber) {
    throw new Error("TABLET_DEVICE 토큰에 조리원·객실·태블릿 범위가 없습니다.");
  }
  if (expected && (
    expected.nurseryId !== claims.nurseryId ||
    expected.roomId !== claims.roomId ||
    expected.tabletId !== claims.tabletId ||
    expected.businessNo.replace(/[^0-9]/g, "") !== claims.businessNumber
  )) {
    throw new Error("태블릿 등록 응답과 Firebase Claim 범위가 일치하지 않습니다.");
  }
}

export async function callTabletDeviceAdmin<T>(payload: Record<string, unknown>) {
  return post<T>("tabletDeviceAdmin", payload, { auth: true });
}
