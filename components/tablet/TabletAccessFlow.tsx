"use client";

import { useEffect, useMemo, useState } from "react";
import { tabletNurseryAccess } from "@/data/accessCredentials";
import { nurseryRoomSelections } from "@/data/nursery/a4Mapping";
import { normalizeBusinessNo } from "@/lib/auth/session";

const loginKey = "a5.tablet.login";
const roomKey = "a5.tablet.room";
const roomEditUnlockKey = "a5.tablet.room-edit-unlocked";

export type TabletRoomSession = {
  nurseryId: string;
  businessNo: string;
  businessName: string;
  roomId: string;
  roomName: string;
  tabletId: string;
  fixedLogin: true;
  updatedAt: string;
};

export function readTabletRoomSession(): TabletRoomSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(roomKey);
    return raw ? (JSON.parse(raw) as TabletRoomSession) : null;
  } catch {
    return null;
  }
}

function readTabletLogin() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(loginKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function TabletAccessGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const hasLogin = readTabletLogin();
      const hasRoom = readTabletRoomSession();
      const ok = Boolean(hasLogin && hasRoom);

      setAllowed(ok);
      setReady(true);

      if (!hasLogin) {
        window.location.replace("/tablet/login");
        return;
      }

      if (!hasRoom) {
        window.location.replace("/tablet/room-setup");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">태블릿 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">객실 설정이 필요합니다</h1>
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
  const [isUnlockOpen, setIsUnlockOpen] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setSession(readTabletRoomSession()), 0);

    function handleStorage() {
      setSession(readTabletRoomSession());
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const businessName = session?.businessName ?? tabletNurseryAccess.businessName;
  const roomName = session?.roomName ?? tabletNurseryAccess.defaultRoomName;

  function unlockRoomEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPassword !== tabletNurseryAccess.defaultPassword) {
      setEditMessage("등록 비밀번호를 확인해 주세요.");
      return;
    }

    window.sessionStorage.setItem(roomEditUnlockKey, "true");
    window.location.assign("/tablet/room-setup");
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-black text-slate-950 ring-1 ring-white/60">
        <span>{businessName}</span>
        <span className="text-slate-400">/</span>
        <span>{roomName}</span>
        <button
          type="button"
          onClick={() => {
            setEditPassword("");
            setEditMessage("");
            setIsUnlockOpen(true);
          }}
          aria-label="객실 정보 수정"
          title="객실 정보 수정"
          className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-white transition hover:bg-rose-600"
        >
          수정
        </button>
      </div>

      {isUnlockOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <form onSubmit={unlockRoomEdit} className="w-full max-w-sm rounded-md bg-white p-5 text-slate-950 shadow-2xl">
            <h2 className="text-2xl font-black">객실 정보 수정</h2>
            <label className="mt-4 grid gap-2 text-sm font-black">
              조리원 비밀번호
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
    const hasLogin = readTabletLogin();
    const hasRoom = readTabletRoomSession();

    if (hasLogin && hasRoom) {
      window.location.replace("/tablet/products");
    }
  }, []);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const businessNoMatches =
      normalizeBusinessNo(businessNo) === normalizeBusinessNo(tabletNurseryAccess.businessNo);

    if (!businessNoMatches || password !== tabletNurseryAccess.defaultPassword) {
      setMessage("산후조리원 사업자등록번호와 비밀번호를 확인해 주세요.");
      return;
    }

    window.localStorage.setItem(
      loginKey,
      JSON.stringify({
        nurseryId: tabletNurseryAccess.nurseryId,
        businessNo: tabletNurseryAccess.businessNo,
        businessName: tabletNurseryAccess.businessName,
        signedInAt: new Date().toISOString(),
      }),
    );
    window.location.assign("/tablet/room-setup");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-md border border-white/15 bg-white/10 p-6 shadow-2xl backdrop-blur-xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-300">TABLET</p>
          <h1 className="mt-3 text-4xl font-black">태블릿 로그인</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            등록된 산후조리원 사업자번호로 태블릿을 확인한 뒤 객실을 선택합니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-md bg-white p-6 text-slate-950 shadow-2xl">
          <h2 className="text-2xl font-black">사업자 계정 확인</h2>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black">
              사업자등록번호
              <input
                value={businessNo}
                onChange={(event) => setBusinessNo(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
                placeholder="1004-1004-1004"
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
            객실 선택으로 이동
          </button>
        </form>
      </section>
    </main>
  );
}

export function TabletRoomSetupPage() {
  const [selectedRoomId, setSelectedRoomId] = useState(tabletNurseryAccess.defaultRoomId);
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [requiresUnlock, setRequiresUnlock] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const rooms = useMemo(() => nurseryRoomSelections, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const login = readTabletLogin();
      if (!login) {
        window.location.replace("/tablet/login");
        return;
      }

      const saved = readTabletRoomSession();
      if (saved) {
        setSelectedRoomId(saved.roomId);
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
    const room = rooms.find((item) => item.roomId === selectedRoomId) ?? rooms[0];
    if (!room) return;

    const session: TabletRoomSession = {
      nurseryId: tabletNurseryAccess.nurseryId,
      businessNo: tabletNurseryAccess.businessNo,
      businessName: tabletNurseryAccess.businessName,
      roomId: room.roomId,
      roomName: `${room.roomNumber}호`,
      tabletId: room.activeTabletId ?? tabletNurseryAccess.defaultTabletId,
      fixedLogin: true,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(roomKey, JSON.stringify(session));
    window.sessionStorage.removeItem(roomEditUnlockKey);
    window.location.assign("/tablet/products");
  }

  function unlockRoomEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPassword !== tabletNurseryAccess.defaultPassword) {
      setEditMessage("등록 비밀번호를 확인해 주세요.");
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
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
        <section className="mx-auto max-w-md rounded-md bg-white p-5 text-slate-950 shadow-2xl">
          <h1 className="text-3xl font-black">객실 변경 확인</h1>
          <form onSubmit={unlockRoomEdit} className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm font-black">
              조리원 비밀번호
              <input
                type="password"
                value={editPassword}
                onChange={(event) => setEditPassword(event.target.value)}
                className="h-12 rounded-md border border-slate-200 px-3 text-base font-bold"
                autoFocus
              />
            </label>
            {editMessage ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-red-700">{editMessage}</p> : null}
            <button type="submit" className="h-12 rounded-md bg-rose-600 text-sm font-black text-white">
              확인
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
      <section className="mx-auto max-w-4xl rounded-md bg-white p-6 text-slate-950 shadow-2xl">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">ROOM SETUP</p>
        <h1 className="mt-2 text-4xl font-black">객실 선택</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          등록된 객실 중 하나를 선택하면 이 태블릿의 주문 출처가 고정됩니다.
        </p>

        <form onSubmit={saveRoom} className="mt-6 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => (
              <button
                key={room.roomId}
                type="button"
                onClick={() => setSelectedRoomId(room.roomId)}
                className={`rounded-md border p-5 text-left transition ${
                  selectedRoomId === room.roomId ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"
                }`}
              >
                <p className="text-3xl font-black">{room.roomNumber}호</p>
                <p className="mt-2 text-sm font-bold opacity-70">{room.activeTabletId}</p>
              </button>
            ))}
          </div>
          <button type="submit" className="h-12 rounded-md bg-rose-600 text-sm font-black text-white">
            적용하고 폐쇄몰 열기
          </button>
        </form>
      </section>
    </main>
  );
}
