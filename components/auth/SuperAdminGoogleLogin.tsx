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
import { getFirebaseAuthClient, getFirebaseRuntimeStatus } from "@/lib/firebase/client";

const superAdminEmail = "rosabaya08@gmail.com";
const sessionKey = "a5.super-admin.session";

type LoginState = "idle" | "checking" | "ready" | "signed_in" | "blocked" | "error";

function normalizeEmail(email?: string | null) {
  return (email ?? "").trim().toLowerCase();
}

function isSuperAdmin(user: User | null) {
  return normalizeEmail(user?.email) === superAdminEmail;
}

function buildSession(user: User) {
  return {
    role: "SUPER_ADMIN",
    provider: "google",
    email: normalizeEmail(user.email),
    displayName: user.displayName ?? "A5 최고관리자",
    uid: user.uid,
    masterEmail: superAdminEmail,
    signedInAt: new Date().toISOString(),
  };
}

export function SuperAdminGoogleLogin() {
  const runtime = useMemo(() => getFirebaseRuntimeStatus(), []);
  const [state, setState] = useState<LoginState>(() => (runtime.configured ? "checking" : "error"));
  const [message, setMessage] = useState(() =>
    runtime.configured
      ? "Firebase Google 로그인 상태를 확인하고 있습니다."
      : `Firebase 공개 환경변수가 부족합니다: ${runtime.missing.join(", ") || "unknown"}`,
  );
  const [signedInEmail, setSignedInEmail] = useState("");

  const persistIfAllowed = useCallback(async (user: User) => {
    const auth = getFirebaseAuthClient();
    const email = normalizeEmail(user.email);
    setSignedInEmail(email);

    if (!isSuperAdmin(user)) {
      window.localStorage.removeItem(sessionKey);
      if (auth) {
        await signOut(auth);
      }
      setState("blocked");
      setMessage(`허용되지 않은 Google 계정입니다. 최고관리자 마스터 계정은 ${superAdminEmail} 입니다.`);
      return;
    }

    window.localStorage.setItem(sessionKey, JSON.stringify(buildSession(user)));
    setState("signed_in");
    setMessage("최고관리자 마스터 계정 인증이 완료되었습니다.");
  }, []);

  useEffect(() => {
    const auth = getFirebaseAuthClient();

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
        setState("error");
        setMessage(error instanceof Error ? error.message : "Google redirect 로그인 결과 확인에 실패했습니다.");
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSignedInEmail("");
        setState("ready");
        setMessage("마스터 Google 계정으로 로그인할 수 있습니다.");
        return;
      }

      void persistIfAllowed(user);
    });

    return unsubscribe;
  }, [persistIfAllowed, runtime.configured]);

  async function handleGoogleLogin() {
    const auth = getFirebaseAuthClient();

    if (!auth) {
      setState("error");
      setMessage("Firebase Auth 초기화가 필요합니다. NEXT_PUBLIC_FIREBASE_* 값을 확인하세요.");
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

      if (code.includes("popup") || code.includes("operation-not-supported")) {
        await signInWithRedirect(auth, provider);
        return;
      }

      setState("error");
      setMessage(error instanceof Error ? error.message : "Google 로그인에 실패했습니다.");
    }
  }

  function goToDashboard() {
    window.location.href = "/admin/dashboard";
  }

  async function handleLogout() {
    const auth = getFirebaseAuthClient();
    window.localStorage.removeItem(sessionKey);

    if (auth) {
      await signOut(auth);
    }

    setSignedInEmail("");
    setState("ready");
    setMessage("로그아웃되었습니다. 마스터 계정으로 다시 로그인할 수 있습니다.");
  }

  const disabled = state === "checking" || !runtime.configured;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">SUPER ADMIN</p>
          <h1 className="mt-3 text-4xl font-black">최고관리자 Google 로그인</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            A5 폐쇄몰 운영 콘솔은 마스터 Google 계정만 최고관리자로 진입합니다. 현재 지정된 마스터 계정은{" "}
            <span className="font-black text-white">{superAdminEmail}</span> 입니다.
          </p>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="rounded-md bg-white/10 p-4">
              <p className="font-black text-white">로그인 방식</p>
              <p className="mt-1 text-slate-300">Firebase Authentication Google provider</p>
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <p className="font-black text-white">권한 기준</p>
              <p className="mt-1 text-slate-300">email == {superAdminEmail}</p>
            </div>
            <div className="rounded-md border border-amber-300/40 bg-amber-300/10 p-4 text-amber-100">
              Firebase Console에서 Google 로그인 provider가 활성화되어 있어야 실제 로그인이 동작합니다. 이 화면은 secret을 저장하지 않습니다.
            </div>
          </div>
        </div>

        <section className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">A5 closed mall</p>
              <h2 className="mt-2 text-2xl font-black">마스터 계정 확인</h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-900">Firebase Auth</span>
          </div>

          <div className="mt-6 grid gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">허용 계정</p>
              <p className="mt-1 break-words text-lg font-black text-slate-950">{superAdminEmail}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">현재 로그인 계정</p>
              <p className="mt-1 break-words text-lg font-black text-slate-950">{signedInEmail || "로그인 전"}</p>
            </div>
          </div>

          <div
            className={`mt-4 rounded-md border p-3 text-sm font-bold ${
              state === "signed_in"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : state === "blocked" || state === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-800"
            }`}
          >
            {message}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={disabled}
              className="h-12 rounded-md bg-slate-950 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Google로 로그인
            </button>
            <button
              type="button"
              onClick={goToDashboard}
              disabled={state !== "signed_in"}
              className="h-12 rounded-md bg-rose-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-rose-200"
            >
              최고관리자 콘솔 열기
            </button>
          </div>

          <button type="button" onClick={handleLogout} className="mt-3 h-11 w-full rounded-md border border-slate-200 text-sm font-black text-slate-700">
            현재 Google 세션 로그아웃
          </button>
        </section>
      </section>
    </main>
  );
}
