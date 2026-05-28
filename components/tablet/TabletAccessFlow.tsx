"use client";

import { useEffect, useMemo, useState } from "react";
import { tabletNurseryAccess } from "@/data/accessCredentials";
import { nurseryExternalMappings, nurseryRoomSelections } from "@/data/nursery/a4Mapping";
import { portalLoginPaths, readPortalSession, type PortalSession } from "@/lib/auth/session";

const roomKey = "a5.tablet.room";
const legacyTabletLoginKey = "a5.tablet.login";
const roomEditUnlockKey = "a5.tablet.room-edit-unlocked";

export type TabletRoomSession = {
  nurseryId: string;
  businessNo: string;
  businessName: string;
  registeredAddress?: string;
  roomId: string;
  roomName: string;
  tabletId: string;
  fixedLogin: true;
  updatedAt: string;
};

function readNurserySession(): PortalSession | null {
  const session = readPortalSession("nursery");
  if (!session || session.role !== "nursery") return null;
  if (!session.nurseryId || !session.businessNo) return null;
  if (!session.termsAcceptedAt || !session.privacyAcceptedAt || !session.marketingConsentAt) return null;
  return session;
}

function nurseryLoginNextPath() {
  return `${portalLoginPaths.nursery}?next=${encodeURIComponent("/tablet/room-setup")}`;
}

function normalizeRoomName(roomNumber: string) {
  return roomNumber.endsWith("호") ? roomNumber : `${roomNumber}호`;
}

function getNurseryMapping(session: PortalSession | null) {
  return nurseryExternalMappings.find(
    (item) =>
      item.nurseryId === session?.nurseryId ||
      item.businessRegistrationNo.replace(/[^0-9]/g, "") === String(session?.businessNo ?? "").replace(/[^0-9]/g, ""),
  );
}

function readStoredRoomSession(): TabletRoomSession | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(roomKey);
    return raw ? (JSON.parse(raw) as TabletRoomSession) : null;
  } catch {
    return null;
  }
}

export function readTabletRoomSession(): TabletRoomSession | null {
  if (typeof window === "undefined") return null;

  const session = readStoredRoomSession();
  if (!session) return null;

  const nurserySession = readNurserySession();
  if (!nurserySession) return session;

  const sameNursery = session.nurseryId === nurserySession.nurseryId;
  const sameBusiness = session.businessNo.replace(/[^0-9]/g, "") === nurserySession.businessNo?.replace(/[^0-9]/g, "");

  if (sameNursery && sameBusiness) return session;

  window.localStorage.removeItem(roomKey);
  return null;
}

export function saveTabletRoomSession(session: TabletRoomSession) {
  if (typeof window === "undefined") return false;

  window.localStorage.setItem(roomKey, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent("a5-tablet-room-session-change"));
  return true;
}

export function TabletAccessGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.removeItem(legacyTabletLoginKey);

      const nurserySession = readNurserySession();
      const roomSession = readTabletRoomSession();
      const ok = Boolean(nurserySession && roomSession);

      setAllowed(ok);
      setReady(true);

      if (!nurserySession) {
        window.location.replace(nurseryLoginNextPath());
        return;
      }

      if (!roomSession) {
        window.location.replace("/tablet/room-setup");
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  if (!ready || !allowed) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
        <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
          <p className="text-sm font-bold text-slate-500">태블릿 접근 확인 중</p>
          <h1 className="mt-2 text-2xl font-black">조리원 로그인과 객실 선택이 필요합니다</h1>
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

  const businessName = session?.businessName ?? "조리원 미선택";
  const roomName = session?.roomName ?? "객실 미선택";

  function unlockRoomEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (editPassword !== tabletNurseryAccess.defaultPassword) {
      setEditMessage("조리원 비밀번호를 확인해 주세요.");
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
  useEffect(() => {
    window.localStorage.removeItem(legacyTabletLoginKey);

    const nurserySession = readNurserySession();
    const roomSession = readTabletRoomSession();

    if (!nurserySession) {
      window.location.replace(nurseryLoginNextPath());
      return;
    }

    if (!roomSession) {
      window.location.replace("/tablet/room-setup");
      return;
    }

    window.location.replace("/tablet/products");
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-4 text-white">
      <section className="w-full max-w-sm rounded-md bg-white p-6 text-center text-slate-950 shadow-2xl">
        <p className="text-sm font-bold text-slate-500">조리원 로그인 확인 중</p>
        <h1 className="mt-2 text-2xl font-black">객실 선택으로 이동합니다</h1>
      </section>
    </main>
  );
}

export function TabletRoomSetupPage() {
  const rooms = useMemo(() => nurseryRoomSelections, []);
  const [nurserySession, setNurserySession] = useState<PortalSession | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.roomId ?? "");
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [requiresUnlock, setRequiresUnlock] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [editPassword, setEditPassword] = useState("");
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.localStorage.removeItem(legacyTabletLoginKey);

      const session = readNurserySession();
      if (!session) {
        window.location.replace(nurseryLoginNextPath());
        return;
      }

      const saved = readTabletRoomSession();
      setNurserySession(session);
      setSelectedRoomId(saved?.roomId ?? rooms[0]?.roomId ?? "");

      if (saved) {
        setRequiresUnlock(true);
        setIsUnlocked(window.sessionStorage.getItem(roomEditUnlockKey) === "true");
      } else {
        setRequiresUnlock(false);
        setIsUnlocked(true);
      }

      setIsBootstrapped(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [rooms]);

  function saveRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!nurserySession) return;

    const room = rooms.find((item) => item.roomId === selectedRoomId) ?? rooms[0];
    if (!room) return;

    const nurseryMapping = getNurseryMapping(nurserySession);
    const session: TabletRoomSession = {
      nurseryId: nurserySession.nurseryId ?? tabletNurseryAccess.nurseryId,
      businessNo: nurserySession.businessNo ?? tabletNurseryAccess.businessNo,
      businessName: nurserySession.displayName || tabletNurseryAccess.businessName,
      registeredAddress: nurseryMapping?.registeredAddress,
      roomId: room.roomId,
      roomName: normalizeRoomName(room.roomNumber),
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
      setEditMessage("조리원 비밀번호를 확인해 주세요.");
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
          <p className="mt-2 text-sm leading-6 text-slate-600">이미 선택된 객실을 바꾸려면 조리원 비밀번호를 다시 입력해야 합니다.</p>
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
        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-600">room setup</p>
        <h1 className="mt-2 text-4xl font-black">객실 선택</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {nurserySession?.displayName ?? "조리원"} 로그인 확인이 완료되었습니다. 등록된 객실 중 하나를 선택하면 이 태블릿의 주문 출처가 고정됩니다.
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
                <p className="text-3xl font-black">{normalizeRoomName(room.roomNumber)}</p>
                <p className="mt-2 text-sm font-bold opacity-70">{room.activeTabletId ?? "태블릿 미지정"}</p>
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
