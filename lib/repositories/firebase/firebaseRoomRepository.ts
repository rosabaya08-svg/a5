import { collection, doc, getDoc, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { RoomListFilters, RoomRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Room } from "@/types/commerce";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function mapRoom(documentId: string, data: Record<string, unknown>): Room {
  const roomNumber = asString(data.room_number ?? data.roomNumber ?? data.name, documentId);

  return {
    id: asString(data.room_id ?? data.roomId, documentId),
    nurseryId: asString(data.nursery_id ?? data.nurseryId),
    name: asString(data.name, roomNumber),
    floor: asString(data.floor, roomNumber.length >= 3 ? `${roomNumber.slice(0, -2)}F` : ""),
    pickupEnabled: Boolean(data.pickup_enabled ?? data.pickupEnabled ?? true),
    activeTabletId: asString(data.active_tablet_id ?? data.activeTabletId) || undefined,
  };
}

function constraints(filters?: RoomListFilters) {
  const items: QueryConstraint[] = [];
  if (filters?.nurseryId) items.push(where("nursery_id", "==", filters.nurseryId));
  if (typeof filters?.pickupEnabled === "boolean") items.push(where("pickup_enabled", "==", filters.pickupEnabled));
  return items;
}

export const firebaseRoomRepository: RoomRepository = {
  async listRooms(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, "rooms"), ...constraints(filters)));
      return repositoryOk(snapshot.docs.map((item) => mapRoom(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore rooms read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore rooms read failed. ${message}`);
    }
  },

  async listRoomsByNursery(nurseryId) {
    return this.listRooms({ nurseryId });
  },

  async getRoomById(roomId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", roomId);
    }

    try {
      const snapshot = await getDoc(doc(db, "rooms", roomId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase room not found.", roomId);
      }

      return repositoryOk(mapRoom(snapshot.id, snapshot.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore room read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore room read failed. ${message}`, roomId);
    }
  },
};
