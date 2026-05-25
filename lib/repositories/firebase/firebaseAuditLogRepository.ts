import { collection, doc, getDocs, query, serverTimestamp, setDoc, where, type QueryConstraint } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { AuditLogRepository, AuditLogInput } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { AuditLog } from "@/types/commerce";
import type { UserRole } from "@/types/roles";

const collectionName = "audit_logs";

function asUserRole(value: unknown): UserRole {
  const allowed: UserRole[] = ["SUPER_ADMIN", "COMPANY_ADMIN", "NURSERY_ADMIN", "TABLET_DEVICE", "CUSTOMER_GUEST"];
  return allowed.includes(value as UserRole) ? (value as UserRole) : "CUSTOMER_GUEST";
}

function mapAuditLog(id: string, data: Record<string, unknown>): AuditLog {
  return {
    id,
    actorRole: asUserRole(data.actorRole ?? data.actor_role),
    actorName: typeof data.actorName === "string" ? data.actorName : typeof data.actor_name === "string" ? data.actor_name : "Unknown",
    action:
      data.action === "create" ||
      data.action === "update" ||
      data.action === "approve" ||
      data.action === "reject" ||
      data.action === "status_change" ||
      data.action === "mock_adapter" ||
      data.action === "blocked"
        ? data.action
        : "update",
    target: typeof data.target === "string" ? data.target : "",
    message: typeof data.message === "string" ? data.message : "",
    createdAt: typeof data.createdAt === "string" ? data.createdAt : typeof data.created_at === "string" ? data.created_at : new Date().toISOString(),
  };
}

export const firebaseAuditLogRepository: AuditLogRepository = {
  async appendAuditLog(input: AuditLogInput) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", input.target);
    }

    const id = `audit-${input.target}-${Date.now()}`;
    const payload: AuditLog = {
      id,
      actorRole: input.actorRole,
      actorName: input.actorName,
      action: input.action,
      target: input.target,
      message: input.message,
      createdAt: input.createdAt,
    };

    try {
      await setDoc(doc(collection(db, collectionName), id), {
        ...payload,
        actor_role: payload.actorRole,
        actor_name: payload.actorName,
        created_at: payload.createdAt,
        guest_write_enabled: true,
        source: "firebase_storefront",
        updated_at: serverTimestamp(),
      });

      return repositoryOk(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore audit log write error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore audit log append failed. ${message}`, input.target);
    }
  },

  async listAuditLogs(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const constraints: QueryConstraint[] = [];
      if (filters?.target) constraints.push(where("target", "==", filters.target));
      if (filters?.actorRole) constraints.push(where("actor_role", "==", filters.actorRole));
      const snapshot = await getDocs(query(collection(db, collectionName), ...constraints));
      return repositoryOk(snapshot.docs.map((item) => mapAuditLog(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore audit log read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore audit log read failed. ${message}`);
    }
  },
};
