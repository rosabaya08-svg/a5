import { FieldPath } from "firebase-admin/firestore";
import { getAdminDb } from "../../firebaseAdmin";
import type { IntegrationPage, IntegrationProduct } from "./types";

type FirestoreData = FirebaseFirestore.DocumentData;

export async function listCompanyIntegrationProducts(input: {
  companyId: string;
  productId?: string;
  limit?: number;
  cursor?: string;
}): Promise<IntegrationPage<IntegrationProduct>> {
  const db = getAdminDb();

  if (input.productId) {
    const doc = await db.collection("products").doc(input.productId).get();
    if (!doc.exists || text(doc.data()?.company_id ?? doc.data()?.companyId) !== input.companyId) {
      return { items: [] };
    }

    return { items: [mapProduct(doc.id, doc.data() ?? {}, input.companyId)] };
  }

  const limit = clampLimit(input.limit);
  let query = db.collection("products").where("company_id", "==", input.companyId).orderBy(FieldPath.documentId());
  if (input.cursor) {
    query = query.startAfter(input.cursor);
  }

  const snapshot = await query.limit(limit + 1).get();
  const pageDocs = snapshot.docs.slice(0, limit);

  return {
    items: pageDocs.map((doc) => mapProduct(doc.id, doc.data(), input.companyId)),
    nextCursor: snapshot.docs.length > limit ? pageDocs.at(-1)?.id : undefined,
  };
}

function mapProduct(id: string, data: FirestoreData, companyId: string): IntegrationProduct {
  return {
    id,
    companyId,
    name: text(data.product_name ?? data.name ?? data.title ?? id),
    modelNo: text(data.model_no ?? data.modelNo),
    brandName: text(data.brand_name ?? data.brandName ?? data.brand),
    makerName: text(data.maker_name ?? data.makerName ?? data.manufacturer),
    salePrice: numberValue(data.sale_price ?? data.price ?? data.unit_price),
    stockQty: numberValue(data.stock ?? data.stock_qty ?? data.inventory_qty),
    status: text(data.status, "active"),
    imageUrl: text(data.thumbnail_url ?? data.image_url ?? data.main_image_url),
    updatedAt: iso(data.updated_at ?? data.created_at),
  };
}

function clampLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 100);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function iso(value: unknown) {
  if (typeof value === "string" && value) return value;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }

  return new Date().toISOString();
}
