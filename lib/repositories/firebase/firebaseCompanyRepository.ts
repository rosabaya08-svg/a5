import { collection, doc, getDoc, getDocs, query, where, type QueryConstraint } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import type { CompanyRepository, CompanyListFilters } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { Company } from "@/types/commerce";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asCompanyStatus(status: unknown, approvalStatus: unknown): Company["status"] {
  if (status === "suspended") return "suspended";
  if (status === "pending" || approvalStatus === "pending_review" || approvalStatus === "pending") return "pending";
  return "approved";
}

function mapCompany(documentId: string, data: Record<string, unknown>): Company {
  return {
    id: asString(data.company_id ?? data.companyId, documentId),
    name: asString(data.name, "A5 company"),
    managerName: asString(data.manager_name ?? data.managerName, "A5 manager"),
    status: asCompanyStatus(data.status, data.approval_status),
    commissionRate: asNumber(data.commission_rate ?? data.commissionRate, 0),
    productCount: asNumber(data.product_count ?? data.productCount, 0),
    pendingProductCount: asNumber(data.pending_product_count ?? data.pendingProductCount, 0),
    settlementBlocked: Boolean(data.settlement_blocked ?? data.settlementBlocked ?? false),
  };
}

function constraints(filters?: CompanyListFilters) {
  const items: QueryConstraint[] = [];
  if (filters?.status === "suspended") items.push(where("status", "==", "suspended"));
  if (filters?.status === "pending") items.push(where("approval_status", "in", ["pending", "pending_review"]));
  if (filters?.status === "approved") items.push(where("status", "in", ["active", "approved"]));
  return items;
}

export const firebaseCompanyRepository: CompanyRepository = {
  async listCompanies(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, "companies"), ...constraints(filters)));
      return repositoryOk(snapshot.docs.map((item) => mapCompany(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore companies read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore companies read failed. ${message}`);
    }
  },

  async getCompanyById(companyId) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", companyId);
    }

    try {
      const snapshot = await getDoc(doc(db, "companies", companyId));

      if (!snapshot.exists()) {
        return repositoryError("NOT_FOUND", "Firebase company not found.", companyId);
      }

      return repositoryOk(mapCompany(snapshot.id, snapshot.data()));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore company read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore company read failed. ${message}`, companyId);
    }
  },
};
