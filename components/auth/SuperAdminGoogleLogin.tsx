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
import { getFirebaseAuthClient, getFirebaseRuntimeStatus } from "@/lib/firebase/client";
import { portalHomePaths, portalSessionKeys } from "@/lib/auth/session";

const superAdminEmail = "rosabaya08@gmail.com";
const sessionKey = portalSessionKeys.admin;

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

  if (code.includes("operation-not-allowed") || message.includes("operation-not-allowed")) {
    return "관리자 Google 로그인 제공자가 아직 활성화되지 않았습니다. 운영자가 로그인 제공자를 사용 설정한 뒤 다시 시도해 주세요.";
  }

  return message;
}

export function SuperAdminGoogleLogin() {
  const params = useSearchParams();
  const runtime = useMemo(() => getFirebaseRuntimeStatus(), []);
  const [state, setState] = useState<LoginState>(() => (runtime.configured ? "checking" : "error"));
  const [message, setMessage] = useState(() =>
    runtime.configured ? "Google 계정 상태를 확인하고 있습니다." : "관리자 Google 로그인 설정 확인이 필요합니다.",
  );
  const [signedInEmail, setSignedInEmail] = useState("");

  const nextPath = params.get("next") || portalHomePaths.admin;

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
      setMessage(`허용되지 않은 Google 계정입니다. 최고관리자 계정은 ${superAdminEmail} 입니다.`);
      return;
    }

    window.localStorage.setItem(sessionKey, JSON.stringify(buildSession(user)));
    setState("signed_in");
    setMessage("최고관리자 인증이 완료되었습니다.");
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
        const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
        setState("error");
        setMessage(friendlyLoginMessage(error instanceof Error ? error.message : "Google 로그인 결과 확인에 실패했습니다.", code));
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setSignedInEmail("");
        setState("ready");
        setMessage("최고관리자 Google 계정으로 로그인해 주세요.");
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

      if (code.includes("popup") || code.includes("operation-not-supported")) {
        await signInWithRedirect(auth, provider);
        return;
      }

      setState("error");
      setMessage(friendlyLoginMessage(error instanceof Error ? error.message : "Google 로그인에 실패했습니다.", code));
    }
  }

  function goToDashboard() {
    window.location.assign(nextPath);
  }

  async function handleLogout() {
    const auth = getFirebaseAuthClient();
    window.localStorage.removeItem(sessionKey);

    if (auth) {
      await signOut(auth);
    }

    setSignedInEmail("");
    setState("ready");
    setMessage("로그아웃되었습니다.");
  }

  const disabled = state === "checking" || !runtime.configured;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <aside className="rounded-md border border-white/15 bg-white/10 p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">MASTER ACCOUNT</p>
          <h1 className="mt-4 text-4xl font-black">최고관리자 Google 로그인</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            A5 운영 콘솔은 지정된 마스터 Google 계정으로만 접근할 수 있습니다.
          </p>
          <div className="mt-6 grid gap-3">
            <div className="rounded-md bg-white/10 p-4">
              <p className="text-sm font-black">허용 계정</p>
              <p className="mt-1 text-sm text-slate-300">{superAdminEmail}</p>
            </div>
            <div className="rounded-md bg-white/10 p-4">
              <p className="text-sm font-black">접근 기준</p>
              <p className="mt-1 text-sm text-slate-300">마스터 계정 인증 완료 후 최고관리자 콘솔로 이동합니다.</p>
            </div>
          </div>
        </aside>

        <section className="rounded-md bg-white p-6 text-slate-950 shadow-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">A5 CLOSED MALL</p>
          <h2 className="mt-3 text-3xl font-black">마스터 계정 확인</h2>
          <div className="mt-6 grid gap-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">허용 계정</p>
              <p className="mt-2 text-xl font-black">{superAdminEmail}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black text-slate-500">현재 로그인 계정</p>
              <p className="mt-2 text-xl font-black">{signedInEmail || "로그인 전"}</p>
            </div>
            {message ? (
              <p className={`rounded-md p-3 text-sm font-bold ${state === "error" || state === "blocked" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800"}`}>
                {message}
              </p>
            ) : null}
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => void handleGoogleLogin()}
              className="rounded-md bg-slate-950 px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Google로 로그인
            </button>
            <button
              type="button"
              disabled={state !== "signed_in"}
              onClick={goToDashboard}
              className="rounded-md bg-rose-500 px-4 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-rose-200"
            >
              최고관리자 콘솔 열기
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="mt-3 w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-black text-slate-900"
          >
            현재 Google 세션 로그아웃
          </button>
        </section>
      </section>
    </main>
  );
}
