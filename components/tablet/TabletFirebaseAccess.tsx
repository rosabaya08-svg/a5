"use client";

import { useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from "firebase/auth";
import { getFirebaseAppCheckToken } from "@/lib/firebase/appCheckClient";
import { getFirebaseAuthClient } from "@/lib/firebase/client";

const loginKey = "a5.tablet.login";
const roomKey = "a5.tablet.room";

export type TabletFirebaseSession = {
  nurseryId: string;
  businessNo: string;
  businessName: string;
  roomId: string;
  roomName: string;
  tabletId: string;
  tabletLabel?: string;
  fixedLogin: true;
  updatedAt: string;
};

type EnrollmentResponse = {
  ok: true;
  customToken: string;
  session: TabletFirebaseSession;
};

type ErrorResponse = {
  error?: string | { code?: string; message?: string };
  message?: string;
};

function functionsBaseUrl() {
  return (process.env.NEXT_PUBLIC_A5_FUNCTIONS_BASE_URL ?? process.env.NEXT_PUBLIC_PAYMENT_API_BASE_URL ?? "").replace(/\/$/, "");
}

function claimRoles(claims: Record<string, unknown>) {
  const values = [claims.role, claims.a5_role, ...(Array.isArray(claims.roles) ? claims.roles : [])];
  return [...new Set(values.map((value) => String(value ?? "").trim().toUpperCase()).filter(Boolean))];
}

function claimString(claims: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = String(claims[key] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function readStoredSession(): TabletFirebaseSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(roomKey);
    return raw ? (JSON.parse(raw) as TabletFirebaseSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: TabletFirebaseSession) {
  const normalized: TabletFirebaseSession = {
    ...session,
    businessNo: session.businessNo.replace(/[^0-9]/g, ""),
    fixedLogin: true,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(roomKey, JSON.stringify(normalized));
  window.localStorage.setItem(loginKey, JSON.stringify({
    nurseryId: normalized.nurseryId,
    businessNo: normalized.businessNo,
    businessName: normalized.businessName,
    tabletId: normalized.tabletId,
    signedInAt: new Date().toISOString(),
    firebaseDevice: true,
  }));
  return normalized;
}

function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(loginKey);
  window.localStorage.removeItem(roomKey);
}

async function validatedSessionFromUser(user: User): Promise<TabletFirebaseSession> {
  const token = await user.getIdTokenResult(true);
  const claims = token.claims as Record<string, unknown>;
  const roles = claimRoles(claims);
  const accessStatus = claimString(claims, "access_status").toUpperCase() || "ACTIVE";
  const nurseryId = claimString(claims, "nursery_id");
  const roomId = claimString(claims, "room_id");
  const tabletId = claimString(claims, "tablet_id");
  const businessNo = claimString(claims, "business_number", "business_no").replace(/[^0-9]/g, "");
  if (!roles.includes("TABLET_DEVICE") || accessStatus !== "ACTIVE" || !nurseryId || !roomId || !tabletId || businessNo.length !== 10) {
    throw new Error("TABLET_DEVICE 역할 또는 조리원·객실·태블릿 범위가 올바르지 않습니다.");
  }
  const cached = readStoredSession();
  const namesMatch = cached && cached.nurseryId === nurseryId && cached.roomId === roomId && cached.tabletId === tabletId;
  return {
    nurseryId,
    businessNo,
    businessName: namesMatch ? cached.businessName : nurseryId,
    roomId,
    roomName: namesMatch ? cached.roomName : roomId,
    tabletId,
    tabletLabel: namesMatch ? cached.tabletLabel : tabletId,
    fixedLogin: true,
    updatedAt: new Date().toISOString(),
  };
}

async function enrollDevice(payload: { businessNumber: string; enrollmentCode: string }): Promise<EnrollmentResponse> {
  const baseUrl = functionsBaseUrl();
  if (!baseUrl) throw new Error("태블릿 등록 서버 주소가 설정되지 않았습니다.");
  const appCheckToken = await getFirebaseAppCheckToken();
  const response = await fetch(`${baseUrl}/tabletDeviceEnroll`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(appCheckToken ? { "X-Firebase-AppCheck": appCheckToken } : {}),
    },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as EnrollmentResponse & ErrorResponse;
  if (!response.ok || body.ok !== true || !body.customToken) {
    const message = typeof body.error === "string" ? body.error : body.error?.message ?? body.message ?? `HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("auth/custom-token-mismatch")) return "태블릿 등록 토큰의 Firebase 프로젝트가 일치하지 않습니다.";
  if (message.includes("auth/invalid-custom-token")) return "태블릿 등록 토큰이 유효하지 않습니다. 새 등록코드를 발급받으세요.";
  return message.replace(/^Firebase:\s*/i, "").replace(/^Error:\s*/i, "") || "태블릿 Firebase 등록에 실패했습니다.";
}

export function TabletFirebaseLoginPage() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [message, setMessage] = useState("A5S 기업관리자가 발급한 1회용 태블릿 등록코드를 입력하세요.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuthClient();
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        persistSession(await validatedSessionFromUser(user));
        window.location.replace("/tablet/products");
      } catch {
        await signOut(auth).catch(() => undefined);
        clearSession();
      }
    });
    return unsubscribe;
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const auth = getFirebaseAuthClient();
    if (!auth) {
      setMessage("Firebase 태블릿 인증 설정이 필요합니다.");
      return;
    }
    const normalizedBusiness = businessNumber.replace(/[^0-9]/g, "");
    if (normalizedBusiness.length !== 10) {
      setMessage("사업자번호는 숫자 10자리여야 합니다.");
      return;
    }
    if (!enrollmentCode.trim()) {
      setMessage("A5S 기업관리자가 발급한 등록코드가 필요합니다.");
      return;
    }
    setBusy(true);
    setMessage("등록코드·사업자번호·객실·태블릿 범위를 서버에서 확인하고 있습니다.");
    try {
      if (auth.currentUser) await signOut(auth);
      clearSession();
      const result = await enrollDevice({ businessNumber: normalizedBusiness, enrollmentCode: enrollmentCode.trim() });
      persistSession(result.session);
      const credential = await signInWithCustomToken(auth, result.customToken);
      persistSession(await validatedSessionFromUser(credential.user));
      window.location.assign("/tablet/products");
    } catch (error) {
      clearSession();
      setMessage(errorMessage(error));
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-md border border-white/15 bg-white/10 p-7 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">FIREBASE TABLET_DEVICE</p>
          <h1 className="mt-3 text-4xl font-black">객실 태블릿 등록</h1>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-300">사업자 공용 비밀번호와 브라우저 저장값으로 로그인하지 않습니다. A5S 기업관리자가 조리원·객실·태블릿을 지정해 발급한 1회용 등록코드로 Firebase 기기 계정을 생성합니다.</p>
          <div className="mt-6 grid gap-2 text-sm font-bold text-slate-300"><p>• TABLET_DEVICE Custom Claims</p><p>• nursery_id / room_id / tablet_id 고정</p><p>• 등록코드 1회 사용 후 자동 폐기</p><p>• 권한 회수 시 Refresh Token 즉시 폐기</p></div>
        </article>
        <form onSubmit={submit} className="rounded-md bg-white p-7 text-slate-950 shadow-2xl">
          <h2 className="text-2xl font-black">1회용 등록코드 확인</h2>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm font-black">조리원 사업자번호<input required inputMode="numeric" value={businessNumber} onChange={(event) => setBusinessNumber(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold" placeholder="하이픈 없이 10자리" /></label>
            <label className="grid gap-2 text-sm font-black">태블릿 등록코드<input required value={enrollmentCode} onChange={(event) => setEnrollmentCode(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 font-mono text-sm font-bold" placeholder="A5T-..." autoComplete="one-time-code" /></label>
          </div>
          <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">{message}</p>
          <button type="submit" disabled={busy} className="mt-6 h-12 w-full rounded-md bg-rose-600 text-sm font-black text-white disabled:opacity-50">{busy ? "Firebase 기기 등록 중" : "태블릿 등록 및 로그인"}</button>
        </form>
      </section>
    </main>
  );
}

export function TabletFirebaseAccessGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({ ready: false, allowed: false, message: "태블릿 Firebase 권한을 확인하고 있습니다." });

  useEffect(() => {
    const auth = getFirebaseAuthClient();
    if (!auth) {
      setState({ ready: true, allowed: false, message: "Firebase 태블릿 인증 설정이 필요합니다." });
      return;
    }
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        clearSession();
        window.location.replace("/tablet/login");
        return;
      }
      try {
        persistSession(await validatedSessionFromUser(user));
        if (!cancelled) setState({ ready: true, allowed: true, message: "" });
      } catch (error) {
        clearSession();
        await signOut(auth).catch(() => undefined);
        if (!cancelled) setState({ ready: true, allowed: false, message: errorMessage(error) });
        window.location.replace("/tablet/login");
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!state.ready || !state.allowed) {
    return <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white"><section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl"><p className="text-sm font-bold text-slate-500">TABLET_DEVICE 확인 중</p><h1 className="mt-2 text-2xl font-black">{state.message}</h1></section></main>;
  }
  return <>{children}</>;
}

export function TabletFirebaseContextBadge() {
  const [session, setSession] = useState<TabletFirebaseSession | null>(null);
  useEffect(() => setSession(readStoredSession()), []);

  async function logout() {
    const auth = getFirebaseAuthClient();
    clearSession();
    if (auth) await signOut(auth).catch(() => undefined);
    window.location.assign("/tablet/login");
  }

  if (!session) return <span className="rounded-full bg-white/80 px-3 py-2 text-xs font-black text-slate-950">TABLET_DEVICE</span>;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-950 ring-1 ring-white/60">
      <span>{session.businessName}</span><span className="text-slate-400">/</span><span>{session.roomName}</span><span className="text-slate-400">/</span><span>{session.tabletLabel || session.tabletId}</span>
      <button type="button" onClick={() => void logout()} className="rounded-full bg-slate-950 px-2 py-1 text-[10px] font-black text-white">등록 해제</button>
    </div>
  );
}

export function TabletFirebaseRoomStatusPage() {
  const [session, setSession] = useState<TabletFirebaseSession | null>(null);
  useEffect(() => setSession(readStoredSession()), []);
  return (
    <TabletFirebaseAccessGate>
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white"><section className="mx-auto max-w-xl rounded-md bg-white p-6 text-slate-950 shadow-2xl"><p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">FIXED TABLET SCOPE</p><h1 className="mt-2 text-3xl font-black">객실 범위는 Firebase Claim으로 고정됩니다</h1><div className="mt-5 grid gap-3 rounded-md bg-slate-100 p-4 text-sm font-bold"><p>조리원: {session?.businessName || session?.nurseryId || "확인 중"}</p><p>객실: {session?.roomName || session?.roomId || "확인 중"}</p><p>태블릿: {session?.tabletLabel || session?.tabletId || "확인 중"}</p></div><p className="mt-4 text-sm font-semibold leading-6 text-slate-600">다른 객실로 변경하려면 A5S 기업관리자가 기존 기기 권한을 회수하고 새 1회용 등록코드를 발급해야 합니다.</p><a href="/tablet/products" className="mt-5 inline-flex rounded-md bg-slate-950 px-4 py-3 text-sm font-black text-white">상품 화면으로 이동</a></section></main>
    </TabletFirebaseAccessGate>
  );
}
