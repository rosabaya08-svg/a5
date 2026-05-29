"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import {
  buildA4RoomImportPreview,
  createImportedNurseryRooms,
  mergeImportedNurseryRooms,
} from "@/lib/nursery/a4RoomImportPreview";
import { syncA4RoomsToA5 } from "@/lib/firebase/a4RoomSyncClient";
import type { Room } from "@/types/commerce";
import type { A4ReadOnlyRoom, A4RoomImportStatus, ImportedNurseryRoom } from "@/types/nursery";

type A4RoomImportPanelProps = {
  nurseryId: string;
  businessRegistrationNo: string;
  existingRooms: Room[];
  a4Rooms: A4ReadOnlyRoom[];
};

const statusLabels: Record<A4RoomImportStatus, string> = {
  new: "신규",
  already_imported: "이미 A5",
  room_number_conflict: "충돌",
  excluded: "제외",
};

const statusClasses: Record<A4RoomImportStatus, string> = {
  new: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  already_imported: "bg-slate-100 text-slate-700 ring-slate-200",
  room_number_conflict: "bg-amber-100 text-amber-900 ring-amber-200",
  excluded: "bg-red-100 text-red-800 ring-red-200",
};

function storageKey(nurseryId: string) {
  return `a5.a4-room-import.${nurseryId}`;
}

function safeParseRooms(value: string | null): ImportedNurseryRoom[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ImportedNurseryRoom[]) : [];
  } catch {
    return [];
  }
}

function normalizeRoomNumber(value: string) {
  return value.replace(/[^0-9A-Za-z가-힣]/g, "").toLowerCase();
}

function makeLocalRoomId(roomNumber: string) {
  return `room-local-${normalizeRoomNumber(roomNumber) || Date.now()}`;
}

function StatusBadge({ status }: { status: A4RoomImportStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${statusClasses[status]}`}>
      {statusLabels[status]}
    </span>
  );
}

export function A4RoomImportPanel({
  nurseryId,
  businessRegistrationNo,
  existingRooms,
  a4Rooms,
}: A4RoomImportPanelProps) {
  const [selectedExternalRoomIds, setSelectedExternalRoomIds] = useState<string[]>([]);
  const [localRooms, setLocalRooms] = useState<ImportedNurseryRoom[]>(() => {
    if (typeof window === "undefined") return [];
    return safeParseRooms(window.localStorage.getItem(storageKey(nurseryId)));
  });
  const [manualRoomNumber, setManualRoomNumber] = useState("");
  const [manualRoomName, setManualRoomName] = useState("");
  const [message, setMessage] = useState("");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(nurseryId), JSON.stringify(localRooms));
  }, [localRooms, nurseryId]);

  const previewRows = useMemo(
    () => buildA4RoomImportPreview(a4Rooms, existingRooms, localRooms),
    [a4Rooms, existingRooms, localRooms],
  );
  const importableRows = previewRows.filter((row) => row.status === "new");
  const selectedImportableCount = selectedExternalRoomIds.filter((id) =>
    importableRows.some((row) => row.externalRoomId === id),
  ).length;
  const externalNurseryId = a4Rooms[0]?.externalNurseryId;

  function toggleRoom(externalRoomId: string) {
    setSelectedExternalRoomIds((current) =>
      current.includes(externalRoomId)
        ? current.filter((item) => item !== externalRoomId)
        : [...current, externalRoomId],
    );
  }

  function importSelectedRooms() {
    const now = new Date().toISOString();
    const incoming = createImportedNurseryRooms(previewRows, selectedExternalRoomIds, nurseryId, now);

    setLocalRooms((current) => mergeImportedNurseryRooms(current, incoming));
    setSelectedExternalRoomIds([]);
    setMessage(`${incoming.length}개 객실을 A5 운영본에 가져왔습니다.`);
  }

  async function syncRoomsToFirestore() {
    const targetExternalRoomIds =
      selectedImportableCount > 0
        ? selectedExternalRoomIds.filter((id) => importableRows.some((row) => row.externalRoomId === id))
        : [];

    if (!businessRegistrationNo.trim() && !externalNurseryId) {
      setMessage("사업자등록번호 또는 A4 조리원 매핑 정보가 없어 객실 연동을 시작할 수 없습니다.");
      return;
    }

    setSyncing(true);
    setMessage(
      targetExternalRoomIds.length > 0
        ? "사업자등록번호가 일치하는 signage-partner 객실 중 선택 객실을 A5로 연동하는 중입니다."
        : "사업자등록번호가 일치하는 signage-partner 객실 전체를 A5로 연동하는 중입니다.",
    );

    const result = await syncA4RoomsToA5({
      nurseryId,
      businessRegistrationNo,
      externalNurseryId,
      selectedExternalRoomIds: targetExternalRoomIds.length > 0 ? targetExternalRoomIds : undefined,
    });

    setSyncing(false);

    if (!result.ok) {
      setMessage(`객실 연동 실패: ${result.error.message}`);
      return;
    }

    const syncedAt = new Date().toISOString();
    const syncedRooms: ImportedNurseryRoom[] = result.imported.map((room) => ({
      id: room.targetRoomId,
      nurseryId,
      roomNumber: room.roomNumber,
      name: room.name,
      floor: "",
      pickupEnabled: room.pickupEnabled,
      activeTabletId: room.activeTabletId,
      externalNurseryId: result.externalNurseryId,
      externalRoomId: room.externalRoomId,
      externalTabletId: room.externalTabletId,
      importSource: "A4_READ_ONLY",
      importedAt: syncedAt,
      localUpdatedAt: syncedAt,
      localOnly: false,
    }));

    setLocalRooms((current) => mergeImportedNurseryRooms(current, syncedRooms));
    setSelectedExternalRoomIds([]);
    setMessage(
      `객실 연동 완료: 사업자번호 ${result.businessRegistrationNo ?? businessRegistrationNo} 기준 ${result.importedCount}개 저장, ${result.skippedCount}개 건너뜀. signage-partner는 읽기만 했습니다.`,
    );
  }

  function addLocalRoom() {
    const roomNumber = manualRoomNumber.trim();
    const name = manualRoomName.trim() || `${roomNumber}호`;
    const roomNumberKey = normalizeRoomNumber(roomNumber || name);
    const hasConflict =
      existingRooms.some((room) => normalizeRoomNumber(room.name || room.id) === roomNumberKey) ||
      localRooms.some((room) => normalizeRoomNumber(room.roomNumber || room.name) === roomNumberKey);

    if (!roomNumberKey) {
      setMessage("객실명을 입력해 주세요.");
      return;
    }

    if (hasConflict) {
      setMessage("같은 객실명이 이미 A5 운영본에 있습니다.");
      return;
    }

    const now = new Date().toISOString();
    setLocalRooms((current) => [
      ...current,
      {
        id: makeLocalRoomId(roomNumber || name),
        nurseryId,
        roomNumber: roomNumber || name,
        name,
        floor: "",
        pickupEnabled: true,
        importSource: "A5_LOCAL",
        importedAt: now,
        localUpdatedAt: now,
        localOnly: true,
      },
    ]);
    setManualRoomNumber("");
    setManualRoomName("");
    setMessage("A5 운영본에 객실을 추가했습니다.");
  }

  function updateLocalRoomName(roomId: string, name: string) {
    const now = new Date().toISOString();
    setLocalRooms((current) =>
      current.map((room) => (room.id === roomId ? { ...room, name, localUpdatedAt: now } : room)),
    );
  }

  return (
    <section className="grid gap-4">
      <div className="rounded-md border border-rose-200 bg-rose-50 p-4 text-rose-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-rose-700">signage-partner read-only import</p>
            <h2 className="mt-1 text-lg font-black">사업자번호 기준 객실연동</h2>
            <p className="mt-2 text-sm leading-6">
              A5 조리원 사업자등록번호와 signage-partner에 등록된 사업자번호를 대조해 같은 사업자의 객실을 한 번에 가져옵니다.
              가져온 후의 객실명 변경과 객실 추가는 A5 운영본에만 저장됩니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-rose-800 ring-1 ring-rose-200">
              signage-partner 쓰기 없음
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">
              사업자번호 {businessRegistrationNo}
            </span>
          </div>
        </div>
      </div>

      <DataTable
        columns={["선택", "A4 객실", "A5 대상", "상태", "출처"]}
        rows={previewRows.map((row) => ({
          id: row.externalRoomId,
          cells: [
            row.status === "new" ? (
              <input
                key="select"
                type="checkbox"
                checked={selectedExternalRoomIds.includes(row.externalRoomId)}
                onChange={() => toggleRoom(row.externalRoomId)}
                className="size-4 accent-rose-600"
                aria-label={`${row.roomName} 선택`}
              />
            ) : (
              <span key="locked" className="text-xs font-bold text-slate-400">-</span>
            ),
            <div key="a4-room">
              <p className="font-black text-slate-950">{row.roomName}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{row.externalRoomId}</p>
            </div>,
            <div key="a5-target">
              <p className="font-bold text-slate-800">{row.targetRoomId}</p>
              <p className="mt-1 text-xs text-slate-500">{row.activeTabletId ?? "태블릿 미연결"}</p>
            </div>,
            <div key="status">
              <StatusBadge status={row.status} />
              <p className="mt-2 text-xs leading-5 text-slate-500">{row.reason}</p>
            </div>,
            <div key="source">
              <p className="font-bold text-slate-700">{row.externalNurseryId}</p>
              <p className="mt-1 text-xs text-slate-500">{row.externalTabletId ?? "external tablet 없음"}</p>
            </div>,
          ],
        }))}
        emptyMessage="A4에서 가져올 객실 후보가 없습니다."
        sortLabel={`A4 후보 ${previewRows.length}개 / 신규 ${importableRows.length}개`}
        paginationLabel={`${selectedImportableCount}개 선택`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-slate-600">{message || "신규 상태인 객실만 A5 운영본으로 가져올 수 있습니다."}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={importSelectedRooms}
            disabled={selectedImportableCount === 0}
            className="h-10 rounded-md border border-rose-200 bg-white px-4 text-sm font-black text-rose-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
          >
            선택 객실 임시 가져오기
          </button>
          <button
            type="button"
            onClick={syncRoomsToFirestore}
            disabled={syncing || (!businessRegistrationNo.trim() && !externalNurseryId)}
            className="h-10 rounded-md bg-rose-600 px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {syncing ? "연동 중" : selectedImportableCount > 0 ? "선택 객실 연동" : "객실 전체 연동"}
          </button>
        </div>
      </div>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            객실번호
            <input
              value={manualRoomNumber}
              onChange={(event) => setManualRoomNumber(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
              placeholder="705"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-slate-700">
            객실명
            <input
              value={manualRoomName}
              onChange={(event) => setManualRoomName(event.target.value)}
              className="h-10 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
              placeholder="705호"
            />
          </label>
          <button type="button" onClick={addLocalRoom} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-black text-white">
            객실 추가
          </button>
        </div>
      </section>

      <DataTable
        columns={["객실", "현장수령", "출처", "객실명 변경"]}
        rows={localRooms.map((room) => ({
          id: room.id,
          cells: [
            <div key="room">
              <p className="font-black text-slate-950">{room.name}</p>
              <p className="mt-1 text-xs font-bold text-slate-500">{room.id}</p>
            </div>,
            room.pickupEnabled ? "가능" : "불가",
            room.importSource === "A4_READ_ONLY" ? (room.localOnly ? "A4 임시" : "A4 연동") : "A5 추가",
            <input
              key="rename"
              value={room.name}
              onChange={(event) => updateLocalRoomName(room.id, event.target.value)}
              className="h-10 w-full min-w-32 rounded-md border border-slate-200 px-3 text-sm text-slate-900"
              aria-label={`${room.name} 객실명 변경`}
            />,
          ],
        }))}
        emptyMessage="아직 A5 운영본에 가져온 객실이 없습니다."
        sortLabel="A5 운영본 수정 영역"
        paginationLabel={`${localRooms.length}개`}
      />
    </section>
  );
}
