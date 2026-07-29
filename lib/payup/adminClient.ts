"use client";

import { getFirebaseAuthClient } from "@/lib/firebase/client";

export type PayupAdminApiResult<T> =
  | { ok: true; data: T; source: "firebase_functions" }
  | { ok: false; error: string; source: "firebase_functions" | "not_configured" };

function functionsBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ?? "").replace(/\/$/, "");
}

async function authHeaders() {
  const auth = getFirebaseAuthClient();
  const token = await auth?.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function callPayupAdmin<T>(functionName: string, payload: Record<string, unknown> = {}): Promise<PayupAdminApiResult<T>> {
  const baseUrl = functionsBaseUrl();
  if (!baseUrl) {
    return {
      ok: false,
      error: "NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL이 없어 실제 PayUp 관리자 API를 호출하지 않았습니다.",
      source: "not_configured",
    };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(`${baseUrl}/${functionName}`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = (await response.json()) as T & { message?: string; error?: { message?: string } | string };

    if (!response.ok) {
      const message = typeof body.error === "string" ? body.error : body.error?.message ?? body.message ?? `HTTP ${response.status}`;
      return { ok: false, error: message, source: "firebase_functions" };
    }

    return { ok: true, data: body, source: "firebase_functions" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "PayUp 관리자 API 요청에 실패했습니다.",
      source: "firebase_functions",
    };
  } finally {
    window.clearTimeout(timer);
  }
}
