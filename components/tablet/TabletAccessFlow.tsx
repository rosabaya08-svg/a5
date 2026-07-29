"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuthClient } from "@/lib/firebase/client";
import {
  enrollTabletDevice,
  logoutTabletDevice,
  verifyTabletDeviceSession,
  type TabletDeviceSession,
} from "@/lib/firebase/tabletDeviceClient";

const loginKey = "a5.tablet.login";
const roomKey = "a5.tablet.room";

export type TabletRoomSession = TabletDeviceSession;

export function readTabletRoomSession(): TabletRoomSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(roomKey);
    return raw ? (JSON.parse(raw) as TabletRoomSession) : null;
  } catch {
    return null;
  }
}

function persistTabletSession(session: TabletRoomSession) {
  window.localStorage.setItem(roomKey, JSON.stringify(session));
  window.localStorage.setItem(loginKey, JSON.stringify({
    role: "TABLET_DEVICE",
    nurseryId: session.nurseryId,
    roomId: session.roomId,
    tabletId: session.tabletId,
    businessNo: session.businessNo,
    signedInAt: new Date().toISOString(),
  }));
}

function clearTabletSession() {
  window.localStorage.removeItem(roomKey);
  window.localStorage.removeItem(loginKey);
}

function redirect(path: string) {
  window.location.replace(path);
}

export function TabletAccessGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("등록된 태블릿 Firebase 권한을 확인하고 있습니다.");

  useEffect(() => {
    let cancelled = false;
    const auth = getFirebaseAuthClient();
    if (!auth) {
      setMessage("Firebase 태블릿 인증 설정이 필요합니다.");
      setReady(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (cancelled) return;
      if (!user) {
        clearTabletSession();
        setAllowed(false);
        setReady(true);
        redirect("/tablet/login");
        return;
      }
      try {
        const verified = await verifyTabletDeviceSession();
        const cached = readTabletRoomSession();
        const matches = Boolean(
          cached &&
          cached.nurseryId === verified.status.nurseryId &&
          cached.roomId === verified.status.roomId &&
          cached.tabletId === verified.status.tabletId &&
          cached.businessNo.replace(/[^0-9]/g, "") === verified.status.businessNo,
        );
        if (!matches) {
          await logoutTabletDevice();
          clearTabletSession();
          setMessage("태블릿 로컬 정보와 Firebase Claim이 일치하지 않아 재등록이 필요합니다.");
          setAllowed(false);
          setReady(true);
          redirect("/tablet/login");
          return;
        }
        setAllowed(true);
        setReady(true);
      } catch (error) {
        await logoutTabletDevice();
        clearTabletSession();
        setMessage(error instanceof Error ? error.message : "태블릿 권한을 확인하지 못했습니다.");
        setAllowed(false);
        setReady(true);
        redirect("/tablet/login");
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">TABLET_DEVICE 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">{message}</h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">사업자번호·공용 비밀번호·localStorage만으로는 접근할 수 없습니다.</p>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}

export function TabletFirstLoginGate() {
  return <TabletAccessGate>{null}</TabletAccessGate>;
}

export function TabletContextBadge() {
  const [session, setSession] = useState<TabletRoomSession | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setSession(readTabletRoomSession()), 0);
    const sync = () => setSession(readTabletRoomSession());
    window.addEventListener("storage", sync);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", sync);
    };
  }, []);

  async function resetEnrollment() {
    await logoutTabletDevice();
    clearTabletSession();
    redirect("/tablet/login");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-950 ring-1 ring-white/60">
        <span>{session?.businessName ?? "등록 확인 중"}</span>
        <span className="text-slate-400">/</span>
        <span>{session?.roomName ?? "객실"}</span>
        <span className="text-slate-400">/</span>
        <span>{session?.tabletLabel ?? session?.tabletId ?? "태블릿"}</span>
        <button type="button" onClick={() => setConfirming(true)} className="rounded-full bg-slate-950 px-2.5 py-1 text-[11px] text-white">재등록</button>
      </div>
      {confirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <section className="w-full max-w-sm rounded-md bg-white p-5 text-slate-950 shadow-2xl">
            <h2 className="text-2xl font-black">태블릿 재등록</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">현재 Firebase 로그인과 로컬 객실 캐시를 삭제합니다. 관리자에게 새 일회용 등록코드를 받아야 합니다.</p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirming(false)} className="h-11 rounded-md bg-slate-100 text-sm font-black">취소</button>
              <button type="button" onClick={() => void resetEnrollment()} className="h-11 rounded-md bg-red-600 text-sm font-black text-white">로그아웃·재등록</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function TabletLoginPage() {
  const [businessNumber, setBusinessNumber] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [message, setMessage] = useState("A5S 기업관리자가 발급한 일회용 태블릿 등록코드를 입력하세요.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const auth = getFirebaseAuthClient();
    if (!auth?.currentUser || !readTabletRoomSession()) return;
    void verifyTabletDeviceSession()
      .then(() => redirect("/tablet/products"))
      .catch(async () => {
        await logoutTabletDevice();
        clearTabletSession();
      });
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedBusinessNumber = businessNumber.replace(/[^0-9]/g, "");
    if (normalizedBusinessNumber.length !== 10 || !enrollmentCode.trim()) {
      setMessage("사업자번호 10자리와 일회용 등록코드를 입력해 주세요.");
      return;
    }
    setBusy(true);
    setMessage("등록코드, 조리원·객실·태블릿 범위와 Firebase Claim을 확인하고 있습니다.");
    try {
      const session = await enrollTabletDevice({ businessNumber: normalizedBusinessNumber, enrollmentCode: enrollmentCode.trim() });
      persistTabletSession(session);
      setMessage("TABLET_DEVICE 등록이 완료됐습니다.");
      redirect("/tablet/room-setup");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "태블릿 등록에 실패했습니다.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">FIREBASE TABLET_DEVICE</p>
          <h1 className="mt-3 text-4xl font-black">태블릿 안전 등록</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">한 번 사용하면 폐기되는 등록코드로 태블릿을 조리원·객실에 고정합니다. 등록 후 서버는 Firebase Claim의 조리원·객실·태블릿 ID를 매 요청마다 확인합니다.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <h2 className="text-2xl font-black">기기 등록</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black">조리원 사업자등록번호<input inputMode="numeric" value={businessNumber} onChange={(event) => setBusinessNumber(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold" placeholder="숫자 10자리" /></label>
            <label className="grid gap-2 text-sm font-black">일회용 등록코드<input value={enrollmentCode} onChange={(event) => setEnrollmentCode(event.target.value)} className="h-12 rounded-md border border-slate-200 px-3 font-mono text-sm font-bold" placeholder="A5T-..." autoComplete="one-time-code" /></label>
          </div>
          <p className="mt-4 rounded-md bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">{message}</p>
          <button type="submit" disabled={busy} className="mt-6 h-12 w-full rounded-md bg-rose-600 text-sm font-black text-white disabled:opacity-50">{busy ? "등록 확인 중" : "Firebase 태블릿 등록"}</button>
        </form>
      </section>
    </main>
  );
}

export function TabletRoomSetupPage() {
  const [session, setSession] = useState<TabletRoomSession | null>(null);
  const [message, setMessage] = useState("등록된 객실 범위를 확인하고 있습니다.");

  useEffect(() => {
    const cached = readTabletRoomSession();
    setSession(cached);
    void verifyTabletDeviceSession()
      .then(({ status }) => {
        if (!cached || cached.nurseryId !== status.nurseryId || cached.roomId !== status.roomId || cached.tabletId !== status.tabletId) {
          throw new Error("Firebase Claim과 객실 캐시가 일치하지 않습니다.");
        }
        setMessage("이 태블릿은 아래 조리원·객실에 고정 등록됐습니다.");
      })
      .catch(async (error) => {
        setMessage(error instanceof Error ? error.message : "태블릿 범위를 확인하지 못했습니다.");
        await logoutTabletDevice();
        clearTabletSession();
        window.setTimeout(() => redirect("/tablet/login"), 1200);
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-xl rounded-md bg-white p-6 text-slate-950 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-600">ASSIGNED DEVICE SCOPE</p>
        <h1 className="mt-2 text-3xl font-black">등록 객실 확인</h1>
        <p className="mt-3 rounded-md bg-blue-50 p-3 text-sm font-bold leading-6 text-blue-900">{message}</p>
        {session ? (
          <div className="mt-5 grid gap-3">
            <div className="rounded-md border border-slate-200 p-4"><p className="text-xs font-black text-slate-500">조리원</p><p className="mt-1 text-xl font-black">{session.businessName}</p></div>
            <div className="rounded-md border border-slate-200 p-4"><p className="text-xs font-black text-slate-500">객실</p><p className="mt-1 text-xl font-black">{session.roomName}</p></div>
            <div className="rounded-md border border-slate-200 p-4"><p className="text-xs font-black text-slate-500">태블릿</p><p className="mt-1 font-black">{session.tabletLabel ?? session.tabletId}</p></div>
            <button type="button" onClick={() => window.location.assign("/tablet/products")} className="mt-2 h-12 rounded-md bg-rose-600 text-sm font-black text-white">쇼핑몰 시작</button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
