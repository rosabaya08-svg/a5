"use client";

import { useEffect, useMemo, useState } from "react";
import { tabletNurseryAccess } from "@/data/accessCredentials";

const loginKey = "a5.tablet.login";
const roomKey = "a5.tablet.room";

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

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/75 px-3 py-1 text-xs font-black text-slate-950 ring-1 ring-white/60 backdrop-blur-md">
      <span>{businessName}</span>
      <span className="text-slate-400">/</span>
      <span>{roomName}</span>
      <a href="/tablet/room-setup" className="rounded-full bg-slate-950 px-2 py-0.5 text-[11px] text-white">
        수정
      </a>
    </div>
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
    window.location.href = "/tablet/room-setup";
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-5xl gap-5 rounded-md border border-white/40 bg-white/70 p-5 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.9fr_1.1fr]">
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

        <form onSubmit={handleSubmit} className="rounded-md bg-white p-5 shadow-sm">
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
      }
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
    window.location.href = "/tablet/products";
  }

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-950">
      <section className="mx-auto max-w-4xl rounded-md border border-white/40 bg-white/72 p-5 shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">room setup</p>
        <h1 className="mt-2 text-4xl font-black">객실 번호 설정</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          최초 설정 이후에는 태블릿 폐쇄몰이 바로 열립니다. 객실 변경은 폐쇄몰 상단의 [수정] 버튼에서 다시 진행합니다.
        </p>

        <form onSubmit={saveRoom} className="mt-6 grid gap-4">
          <label className="grid gap-2 text-sm font-black">
            A2 등록 사업자명
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
