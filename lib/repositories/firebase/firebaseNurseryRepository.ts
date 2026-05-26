import { collection, doc, getDoc, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { NurseryListFilters, NurseryRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Nursery } from "@/types/commerce";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asNurseryStatus(status: unknown, approvalStatus: unknown): Nursery["status"] {
  if (status === "suspended") return "suspended";
  if (status === "pending" || approvalStatus === "pending_review" || approvalStatus === "pending") return "pending";
  return "approved";
}

function mapNursery(documentId: string, data: Record<string, unknown>): Nursery {
  return {
    id: asString(data.nursery_id ?? data.nurseryId, documentId),
    name: asString(data.name, "A5 nursery"),
    region: asString(data.region, ""),
    managerName: asString(data.manager_name ?? data.managerName, "A5 nursery manager"),
    roomCount: asNumber(data.room_count ?? data.roomCount, 0),
    tabletCount: asNumber(data.tablet_count ?? data.tabletCount, 0),
    status: asNurseryStatus(data.status, data.approval_status),
  };
}

function constraints(filters?: NurseryListFilters) {
  const items: QueryConstraint[] = [];
  if (filters?.status === "suspended") items.push(where("status", "==", "suspended"));
  if (filters?.status === "approved") items.push(where("status", "in", ["active", "approved"]));
  if (filters?.status === "pending") items.push(where("approval_status", "in", ["pending", "pending_review"]));
  return items;
}

export const firebaseNurseryRepository: NurseryRepository = {
  async listNurseries(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, "nurseries"), ...constraints(filters)));
      const nurseries = snapshot.docs
        .map((item) => mapNursery(item.id, item.data()))
        .filter((nursery) => !filters?.region || nursery.region.includes(filters.region));
      return repositoryOk(nurseries);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore nurseries read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore nurseries read failed. ${message}`);
    }
  },

  async getNurseryById(nurseryId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", nurseryId);
    }

    try {
      const snapshot = await getDoc(doc(db, "nurseries", nurseryId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase nursery not found.", nurseryId);
      }

      return repositoryOk(mapNursery(snapshot.id, snapshot.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore nursery read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore nursery read failed. ${message}`, nurseryId);
    }
  },
};
