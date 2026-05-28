"use client";

import { useState } from "react";
import { DataTable } from "@/components/ui/DataTable";
import { readLocalNurseryRoomDeviceSync } from "@/lib/nursery/nurseryRoomDeviceSync";
import { formatDateTime } from "@/lib/utils/format";
import type { Nursery, Room, Tablet } from "@/types/commerce";

type AdminRoomsTableProps = {
  rooms: Room[];
  nurseries: Nursery[];
};

type AdminTabletsTableProps = {
  rooms: Room[];
  tablets: Tablet[];
};

function uniqueById<T extends { id: string }>(items: T[]) {
  const byId = new Map<string, T>();

  for (const item of items) {
    byId.set(item.id, { ...byId.get(item.id), ...item });
  }

  return [...byId.values()];
}

export function AdminRoomsTable({ rooms, nurseries }: AdminRoomsTableProps) {
  const [linked] = useState(() => (typeof window === "undefined" ? { rooms: [], tablets: [] } : readLocalNurseryRoomDeviceSync()));
  const mergedRooms = uniqueById([...rooms, ...linked.rooms]);

  return (
    <DataTable
      columns={["객실", "조리원", "현장수령", "연결 태블릿"]}
      rows={mergedRooms.map((room) => ({
        id: room.id,
        cells: [
          <span key="name" className="font-bold text-slate-950">{room.name}</span>,
          nurseries.find((nursery) => nursery.id === room.nurseryId)?.name ?? room.nurseryId,
          room.pickupEnabled ? "가능" : "불가",
          room.activeTabletId ?? "미연결",
        ],
      }))}
    />
  );
}

export function AdminTabletsTable({ rooms, tablets }: AdminTabletsTableProps) {
  const [linked] = useState(() => (typeof window === "undefined" ? { rooms: [], tablets: [] } : readLocalNurseryRoomDeviceSync()));
  const mergedRooms = uniqueById([...rooms, ...linked.rooms]);
  const mergedTablets = uniqueById([...tablets, ...linked.tablets]);

  return (
    <DataTable
      columns={["태블릿", "객실", "상태", "마지막 접속", "세션 출처"]}
      rows={mergedTablets.map((tablet) => ({
        id: tablet.id,
        cells: [
          <span key="label" className="font-bold text-slate-950">{tablet.label}</span>,
          mergedRooms.find((room) => room.id === tablet.roomId)?.name ?? tablet.roomId,
          tablet.status,
          formatDateTime(tablet.lastSeenAt),
          "nursery_id + room_id + tablet_id",
        ],
      }))}
    />
  );
}
