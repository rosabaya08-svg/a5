"use client";

import { useEffect, useMemo, useState } from "react";
import { tabletNurseryAccess } from "@/data/accessCredentials";

const loginKey = "a5.tablet.login";
const roomKey = "a5.tablet.room";
const roomEditUnlockKey = "a5.tablet.room-edit-unlocked";

function normalizeBusinessNo(value: string) {
  return value.replace(/[^0-9]/g, "");
}

type TabletRoomSession = {
  nurseryId: string;
  businessNo: string;
  businessName: string;
  roomName: string;
  fixedLogin: true;
  updatedAt: string;
};

function readRoomSession(): TabletRoomSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(roomKey);
    return raw ? (JSON.parse(raw) as TabletRoomSession) : null;
  } catch {
    return null;
  }
}

export function TabletFirstLoginGate() {
  useEffect(() => {
    const hasLogin = window.localStorage.getItem(loginKey);
    const hasRoom = window.localStorage.getItem(roomKey);

    if (!hasLogin) {
      window.location.replace("/tablet/login");
      return;
    }

    if (!hasRoom) {
      window.location.replace("/tablet/room-setup");
    }
  }, []);

  return null;
}

export function TabletContextBadge() {
  const [session, setSession] = useState<TabletRoomSession | null>(null);
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSession(readRoomSession()), 0);

    function handleStorage() {
      setSession(readRoomSession());
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const businessName = session?.businessName ?? tabletNurseryAccess.businessName;
  const roomName = session?.roomName ?? tabletNurseryAccess.defaultRoomName;

  function openUnlock() {
    setEditPassword("");
    setEditMessage("");
    setIsUnlockOpen(true);
  }

  function unlockRoomEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPassword !== tabletNurseryAccess.defaultPassword) {
      setEditMessage("산후조리원 등록 비밀번호를 확인해 주세요.");
      return;
    }

    window.sessionStorage.setItem(roomEditUnlockKey, "true");
    window.location.assign("/tablet/room-setup");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/35 px-3 py-1 text-xs font-black text-slate-950 ring-1 ring-white/60 backdrop-blur-md">
        <span>{businessName}</span>
        <span className="text-slate-400">/</span>
        <span>{roomName}</span>
        <button
          type="button"
          onClick={openUnlock}
          aria-label="객실 정보 수정"
          title="객실 정보 수정"
          className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-rose-600"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
            <path
              d="M4 16.75V20h3.25L17.8 9.45l-3.25-3.25L4 16.75Zm16.3-10.1a1.1 1.1 0 0 0 0-1.55L18.9 3.7a1.1 1.1 0 0 0-1.55 0l-1.1 1.1 3.25 3.25 1.1-1.4Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>

      {isUnlockOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <form onSubmit={unlockRoomEdit} className="w-full max-w-sm rounded-md bg-white p-5 text-slate-950 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-rose-600">room edit lock</p>
            <h2 className="mt-2 text-2xl font-black">객실 정보 수정</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              고객이 임의로 조리원/객실을 바꾸지 못하도록 산후조리원 가입 비밀번호를 확인합니다.
            </p>
            <label className="mt-4 grid gap-2 text-sm font-black">
              산후조리원 비밀번호
              <input
                type="password"
                value={editPassword}
                onChange={(event) => setEditPassword(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
                autoFocus
              />
            </label>
            {editMessage ? <p className="mt-3 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{editMessage}</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsUnlockOpen(false)} className="h-11 rounded-md bg-slate-100 text-sm font-black text-slate-900">
                취소
              </button>
              <button type="submit" className="h-11 rounded-md bg-rose-600 text-sm font-black text-white">
                확인
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function TabletLoginPage() {
  const [businessNo, setBusinessNo] = useState(tabletNurseryAccess.businessNo);
  const [password, setPassword] = useState(tabletNurseryAccess.defaultPassword);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const hasLogin = window.localStorage.getItem(loginKey);
    const hasRoom = window.localStorage.getItem(roomKey);

    if (hasLogin && hasRoom) {
      window.location.replace("/tablet/products");
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const businessNoMatches =
      normalizeBusinessNo(businessNo) === normalizeBusinessNo(tabletNurseryAccess.businessNo);

    if (!businessNoMatches || !password) {
      setMessage("산후조리원 사업자등록번호와 비밀번호를 확인해 주세요. 베타 기본값은 1004입니다.");
      return;
    }

    window.localStorage.setItem(
      loginKey,
      JSON.stringify({
        nurseryId: tabletNurseryAccess.nurseryId,
        businessNo: tabletNurseryAccess.businessNo,
        businessName: tabletNurseryAccess.businessName,
        loginMode: "tablet-fixed-login-beta",
        signedInAt: new Date().toISOString(),
      }),
    );
    window.location.assign("/tablet/room-setup");
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-5xl gap-5 rounded-md border border-white/40 bg-white/35 p-5 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md bg-slate-950 p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">tablet first login</p>
          <h1 className="mt-3 text-4xl font-black">태블릿 폐쇄몰 로그인</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            최초 로그인 시 산후조리원 사업자등록번호로 기기를 고정합니다. 이후 객실 설정이 완료되면 폐쇄몰 메인으로 바로 이동합니다.
          </p>
          <div className="mt-5 rounded-md border border-amber-300/40 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
            이 화면은 A5 베타 고정로그인 UI입니다. 운영에서는 기기 등록, Custom Claims, App Check, 태블릿 단말 식별이 필요합니다.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-md bg-white/55 p-5 shadow-sm backdrop-blur-xl">
          <h2 className="text-2xl font-black">산후조리원 확인</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black">
              산후조리원 사업자등록번호
              <input
                value={businessNo}
                onChange={(event) => setBusinessNo(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
                placeholder="000-00-00000"
              />
            </label>
            <label className="grid gap-2 text-sm font-black">
              비밀번호
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
                placeholder="1004"
              />
            </label>
          </div>
          {message ? <p className="mt-4 rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p> : null}
          <button type="submit" className="mt-6 h-12 w-full rounded-md bg-rose-600 text-sm font-black text-white">
            객실 번호 설정으로 이동
          </button>
        </form>
      </section>
    </main>
  );
}

export function TabletRoomSetupPage() {
  const [roomName, setRoomName] = useState(tabletNurseryAccess.defaultRoomName);
  const [businessName, setBusinessName] = useState(tabletNurseryAccess.businessName);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [requiresUnlock, setRequiresUnlock] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const roomExamples = useMemo(() => ["701호", "702호", "501호", "601호"], []);

  useEffect(() => {
    const login = window.localStorage.getItem(loginKey);
    if (!login) {
      window.location.replace("/tablet/login");
      return;
    }

    const timer = window.setTimeout(() => {
      const saved = readRoomSession();
      if (saved) {
        setRoomName(saved.roomName);
        setBusinessName(saved.businessName);
        setRequiresUnlock(true);
        setIsUnlocked(window.sessionStorage.getItem(roomEditUnlockKey) === "true");
      } else {
        setRequiresUnlock(false);
        setIsUnlocked(true);
      }
      setIsBootstrapped(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function saveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanRoom = roomName.trim();

    if (!cleanRoom) return;

    window.localStorage.setItem(
      roomKey,
      JSON.stringify({
        nurseryId: tabletNurseryAccess.nurseryId,
        businessNo: tabletNurseryAccess.businessNo,
        businessName: businessName.trim() || tabletNurseryAccess.businessName,
        roomName: cleanRoom,
        fixedLogin: true,
        updatedAt: new Date().toISOString(),
      } satisfies TabletRoomSession),
    );
    window.sessionStorage.removeItem(roomEditUnlockKey);
    window.location.assign("/tablet/products");
  }

  function unlockRoomEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPassword !== tabletNurseryAccess.defaultPassword) {
      setEditMessage("산후조리원 등록 비밀번호를 확인해 주세요.");
      return;
    }

    window.sessionStorage.setItem(roomEditUnlockKey, "true");
    setIsUnlocked(true);
    setEditMessage("");
  }

  if (!isBootstrapped) {
    return null;
  }

  if (requiresUnlock && !isUnlocked) {
    return (
      <main className="min-h-screen bg-transparent px-4 py-8 text-slate-950">
        <section className="mx-auto max-w-md rounded-md border border-white/40 bg-white/35 p-5 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">room edit lock</p>
          <h1 className="mt-2 text-3xl font-black">객실 정보 수정 확인</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            등록된 산후조리원 비밀번호를 입력해야 조리원명과 객실 번호를 바꿀 수 있습니다.
          </p>
          <form onSubmit={unlockRoomEdit} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black">
              산후조리원 비밀번호
              <input
                type="password"
                value={editPassword}
                onChange={(event) => setEditPassword(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
                autoFocus
              />
            </label>
            {editMessage ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{editMessage}</p> : null}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => window.location.assign("/tablet/products")} className="h-12 rounded-md bg-slate-100 text-sm font-black text-slate-900">
                취소
              </button>
              <button type="submit" className="h-12 rounded-md bg-rose-600 text-sm font-black text-white">
                확인
              </button>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-md border border-white/40 bg-white/35 p-5 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">room setup</p>
        <h1 className="mt-2 text-4xl font-black">객실 번호 설정</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          최초 설정 이후에는 태블릿 폐쇄몰이 바로 열립니다. 객실 변경은 상단 연필 아이콘에서 비밀번호 확인 후 진행합니다.
        </p>

        <form onSubmit={saveRoom} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-black">
            등록 산후조리원명
            <input
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
            />
          </label>
          <label className="grid gap-2 text-sm font-black">
            객실 번호
            <input
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
              placeholder="701호"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {roomExamples.map((room) => (
              <button
                key={room}
                type="button"
                onClick={() => setRoomName(room)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"
              >
                {room}
              </button>
            ))}
          </div>
          <button type="submit" className="h-12 rounded-md bg-slate-950 text-sm font-black text-white">
            적용하고 폐쇄몰 열기
          </button>
        </form>
      </section>
    </main>
  );
}
