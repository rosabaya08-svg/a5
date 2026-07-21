"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { getFirebaseAdminAuthClient, getFirebaseRuntimeStatus } from "@/lib/firebase/client";
import { clearPortalSession, portalHomePaths, writePortalSession } from "@/lib/auth/session";

const superAdminEmail = "rosabaya08@gmail.com";

type LoginState = "idle" | "checking" | "ready" | "signed_in" | "blocked" | "error";

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function isSuperAdmin(user: User | null) {
  return normalizeEmail(user?.email) === superAdminEmail;
}

function buildSession(user: User) {
  return {
    role: "SUPER_ADMIN" as const,
    accountId: user.uid,
    provider: "google",
    email: normalizeEmail(user.email),
    displayName: user.displayName ?? "A5 최고관리자",
    uid: user.uid,
    masterEmail: superAdminEmail,
    signedInAt: new Date().toISOString(),
  };
}

function friendlyLoginMessage(message: string, code = "") {
  if (message.includes("api-key-not-valid") || message.includes("API key not valid")) {
    return "관리자 Google 로그인 설정이 완료되지 않았습니다. 운영자에게 문의해 주세요.";
  }

  if (code.includes("internal-error") || message.includes("auth/internal-error")) {
    return "Google 로그인 초기화가 실패했습니다. Firebase Auth 승인 도메인과 Google 로그인 제공자 설정을 확인해야 합니다.";
  }

  if (code.includes("operation-not-allowed") || message.includes("operation-not-allowed")) {
    return "관리자 Google 로그인 제공자가 아직 활성화되지 않았습니다. 운영자가 로그인 제공자를 사용 설정한 뒤 다시 시도해 주세요.";
  }

  return message;
}

function shouldUseRedirectFallback(message: string, code = "") {
  const value = `${code} ${message}`.toLowerCase();
  return (
    value.includes("popup") ||
    value.includes("operation-not-supported") ||
    value.includes("internal-error") ||
    value.includes("network-request-failed")
  );
}

export function SuperAdminGoogleLogin() {
  const params = useSearchParams();
  const runtime = useMemo(() => getFirebaseRuntimeStatus(), []);
  const [state, setState] = useState<LoginState>(() => (runtime.configured ? "checking" : "error"));
  const [message, setMessage] = useState(() =>
    runtime.configured ? "Google 계정 상태를 확인하고 있습니다." : "관리자 Google 로그인 설정 확인이 필요합니다.",
  );

  const nextPath = params?.get("next") || portalHomePaths.admin;

  const persistIfAllowed = useCallback(async (user: User) => {
    const auth = getFirebaseAdminAuthClient();

    if (!isSuperAdmin(user)) {
      clearPortalSession("admin");
      if (auth) {
        await signOut(auth);
      }
      setState("blocked");
      setMessage(`허용되지 않은 Google 계정입니다. 최고관리자 계정은 ${superAdminEmail} 입니다.`);
      return;
    }

    writePortalSession("admin", buildSession(user));
    setState("signed_in");
    setMessage("최고관리자 인증이 완료되었습니다.");
  }, []);

  useEffect(() => {
    const auth = getFirebaseAdminAuthClient();

    if (!runtime.configured || !auth) {
      return undefined;
    }

    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          return persistIfAllowed(result.user);
        }

        return undefined;
      })
      .catch((error: unknown) => {
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        setState("error");
        setMessage(friendlyLoginMessage(error instanceof Error ? error.message : "Google 로그인 결과 확인에 실패했습니다.", code));
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setState("ready");
        setMessage("최고관리자 Google 계정으로 로그인해 주세요.");
        return;
      }

      void persistIfAllowed(user);
    });

    return unsubscribe;
  }, [persistIfAllowed, runtime.configured]);

  async function handleGoogleLogin() {
    const auth = getFirebaseAdminAuthClient();

    if (!auth) {
      setState("error");
      setMessage("관리자 Google 로그인 설정이 완료되지 않았습니다. 운영자에게 문의해 주세요.");
      return;
    }

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: superAdminEmail, prompt: "select_account" });

    setState("checking");
    setMessage("Google 로그인 창을 여는 중입니다.");

    try {
      const credential = await signInWithPopup(auth, provider);
      await persistIfAllowed(credential.user);
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
      const errorMessage = error instanceof Error ? error.message : "Google 로그인에 실패했습니다.";

      if (shouldUseRedirectFallback(errorMessage, code)) {
        setMessage("Google 로그인 방식을 전환하는 중입니다.");
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirectError) {
          const redirectCode = typeof redirectError === "object" && redirectError && "code" in redirectError ? String(redirectError.code) : "";
          setState("error");
          setMessage(friendlyLoginMessage(redirectError instanceof Error ? redirectError.message : errorMessage, redirectCode));
        }
        return;
      }

      setState("error");
      setMessage(friendlyLoginMessage(errorMessage, code));
    }
  }

  function goToDashboard() {
    window.location.assign(nextPath);
  }

  async function handleLogout() {
    const auth = getFirebaseAdminAuthClient();
    clearPortalSession("admin");

    if (auth) {
      await signOut(auth);
    }

    setState("ready");
    setMessage("로그아웃되었습니다.");
  }

  const disabled = state === "checking" || !runtime.configured;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <section className="w-full rounded-md bg-white p-6 text-slate-950 shadow-xl">
          <h1 className="sr-only">최고관리자 Google 로그인</h1>
          {message ? (
            <p className={`rounded-md p-3 text-sm font-normal ${state === "error" || state === "blocked" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
              {message}
            </p>
          ) : null}
          <div className="mt-4 grid gap-3">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleGoogleLogin()}
              className="rounded-md bg-slate-950 px-4 py-4 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Google로 로그인
            </button>
            <button
              type="button"
              disabled={state !== "signed_in"}
              onClick={goToDashboard}
              className="rounded-md bg-rose-500 px-4 py-4 text-sm font-normal text-white disabled:cursor-not-allowed disabled:bg-rose-200"
            >
              최고관리자 콘솔 열기
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-3 w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-normal text-slate-900"
          >
            현재 Google 세션 로그아웃
          </button>
        </section>
      </section>
    </main>
  );
}
