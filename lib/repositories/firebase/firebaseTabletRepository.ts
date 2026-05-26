import { collection, doc, getDoc, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { TabletListFilters, TabletRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Tablet } from "@/types/commerce";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asTabletStatus(value: unknown): Tablet["status"] {
  return value === "inactive" || value === "maintenance" ? value : "active";
}

function mapTablet(documentId: string, data: Record<string, unknown>): Tablet {
  return {
    id: asString(data.tablet_id ?? data.tabletId, documentId),
    nurseryId: asString(data.nursery_id ?? data.nurseryId),
    roomId: asString(data.room_id ?? data.roomId),
    label: asString(data.label, documentId),
    status: asTabletStatus(data.status),
    lastSeenAt: asString(data.last_seen_at ?? data.lastSeenAt, new Date().toISOString()),
  };
}

function constraints(filters?: TabletListFilters) {
  const items: QueryConstraint[] = [];
  if (filters?.nurseryId) items.push(where("nursery_id", "==", filters.nurseryId));
  if (filters?.roomId) items.push(where("room_id", "==", filters.roomId));
  if (filters?.status) items.push(where("status", "==", filters.status));
  return items;
}

export const firebaseTabletRepository: TabletRepository = {
  async listTablets(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, "tablets"), ...constraints(filters)));
      return repositoryOk(snapshot.docs.map((item) => mapTablet(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore tablets read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore tablets read failed. ${message}`);
    }
  },

  async listTabletsByNursery(nurseryId) {
    return this.listTablets({ nurseryId });
  },

  async getTabletById(tabletId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", tabletId);
    }

    try {
      const snapshot = await getDoc(doc(db, "tablets", tabletId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase tablet not found.", tabletId);
      }

      return repositoryOk(mapTablet(snapshot.id, snapshot.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore tablet read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore tablet read failed. ${message}`, tabletId);
    }
  },
};
