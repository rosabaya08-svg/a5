import { FieldPath, FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../../firebaseAdmin";
import type { IntegrationOrder, IntegrationOrderItem, IntegrationOrderStatus, IntegrationPage } from "./types";

type FirestoreData = FirebaseFirestore.DocumentData;

export async function listCompanyIntegrationOrders(input: {
  companyId: string;
  orderNo?: string;
  startDate?: string;
  endDate?: string;
  status?: IntegrationOrderStatus;
  limit?: number;
}): Promise<IntegrationOrder[]> {
  const page = await listCompanyIntegrationOrdersPage(input);
  return page.items;
}

export async function listCompanyIntegrationOrdersPage(input: {
  companyId: string;
  orderNo?: string;
  startDate?: string;
  endDate?: string;
  status?: IntegrationOrderStatus;
  limit?: number;
  cursor?: string;
}): Promise<IntegrationPage<IntegrationOrder>> {
  const db = getAdminDb();
  const limit = clampLimit(input.limit);
  let itemQuery = input.orderNo
    ? db.collection("order_items").where("company_id", "==", input.companyId).where("order_no", "==", input.orderNo).orderBy(FieldPath.documentId())
    : db.collection("order_items").where("company_id", "==", input.companyId).orderBy(FieldPath.documentId());

  if (input.cursor) {
    itemQuery = itemQuery.startAfter(input.cursor);
  }

  itemQuery = itemQuery.limit(limit + 1);
  const itemSnapshot = await itemQuery.get();
  const pageDocs = itemSnapshot.docs.slice(0, limit);
  const nextCursor = itemSnapshot.docs.length > limit ? pageDocs.at(-1)?.id : undefined;
  const items = pageDocs.map((doc) => mapOrderItem(doc.id, doc.data()));
  const orderNos = [...new Set(items.map((item) => item.orderNo).filter(Boolean))];
  const orders = await Promise.all(orderNos.map((orderNo) => db.collection("orders").doc(orderNo).get()));
  const itemsByOrderNo = groupBy(items, (item) => item.orderNo);

  const filtered = orders
    .filter((doc) => doc.exists)
    .map((doc) => mapOrder(doc.id, doc.data() ?? {}, input.companyId, itemsByOrderNo.get(doc.id) ?? []))
    .filter((order) => {
      if (input.status && order.status !== input.status) return false;
      if (input.startDate && toSabangDate(order.paidAt || order.createdAt) < input.startDate) return false;
      if (input.endDate && toSabangDate(order.paidAt || order.createdAt) > input.endDate) return false;
      return true;
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    items: filtered,
    nextCursor,
  };
}

export async function updateOrderItemsShipment(input: {
  companyId: string;
  orderNo: string;
  orderGoodsNum?: string;
  carrierCode: string;
  sheetNo: string;
}) {
  const db = getAdminDb();
  const query = input.orderGoodsNum
    ? db.collection("order_items").where("company_id", "==", input.companyId).where("order_no", "==", input.orderNo)
    : db.collection("order_items").where("company_id", "==", input.companyId).where("order_no", "==", input.orderNo);
  const snapshot = await query.get();
  const targets = snapshot.docs.filter((doc) => !input.orderGoodsNum || doc.id === input.orderGoodsNum || doc.id.endsWith(`-${input.orderGoodsNum}`));

  if (!targets.length) return { updated: 0 };

  await db.runTransaction(async (transaction) => {
    for (const doc of targets) {
      transaction.set(
        doc.ref,
        {
          delivery_status: "in_transit",
          carrier_code: input.carrierCode,
          sheet_no: input.sheetNo,
          shipped_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    transaction.set(
      db.collection("orders").doc(input.orderNo),
      {
        status: "shipping",
        delivery_status: "in_transit",
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { updated: targets.length };
}

export async function updateOrderItemsStatus(input: {
  companyId: string;
  orderNo: string;
  orderGoodsNum?: string;
  status: IntegrationOrderStatus;
}) {
  const db = getAdminDb();
  const snapshot = await db.collection("order_items").where("company_id", "==", input.companyId).where("order_no", "==", input.orderNo).get();
  const targets = snapshot.docs.filter((doc) => !input.orderGoodsNum || doc.id === input.orderGoodsNum || doc.id.endsWith(`-${input.orderGoodsNum}`));

  if (!targets.length) return { updated: 0 };

  await db.runTransaction(async (transaction) => {
    for (const doc of targets) {
      transaction.set(
        doc.ref,
        {
          delivery_status: deliveryStatusFor(input.status),
          integration_status: input.status,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    transaction.set(
      db.collection("orders").doc(input.orderNo),
      {
        status: orderStatusFor(input.status),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  return { updated: targets.length };
}

export function toSabangDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value ?? "").replace(/\D/g, "").padEnd(14, "0").slice(0, 14);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0"),
  ].join("");
}

function mapOrder(documentId: string, data: FirestoreData, companyId: string, items: IntegrationOrderItem[]): IntegrationOrder {
  return {
    id: text(data.id ?? data.order_id, documentId),
    orderNo: text(data.orderNo ?? data.order_no, documentId),
    companyId,
    status: normalizeOrderStatus(data.status),
    paidAt: iso(data.paidAt ?? data.paid_at),
    createdAt: iso(data.createdAt ?? data.created_at),
    customerName: text(data.customerName ?? data.customer_name, "Guest"),
    customerPhoneMasked: text(data.customerPhoneMasked ?? data.customer_phone_masked, "010-****-0000"),
    receiverAddress: optionalText(data.receiver_address),
    receiverAddressDetail: optionalText(data.receiver_address_detail),
    deliveryMethod: data.deliveryMethod === "delivery" || data.delivery_method === "delivery" ? "delivery" : "pickup",
    totalAmount: number(data.totalAmount ?? data.total_amount),
    items,
  };
}

function mapOrderItem(documentId: string, data: FirestoreData): IntegrationOrderItem {
  const quantity = number(data.quantity, 1);
  const unitPrice = number(data.unit_price ?? data.unitPrice);

  return {
    id: text(data.id ?? data.order_item_id, documentId),
    orderNo: text(data.order_no ?? data.orderId ?? data.order_id),
    companyId: text(data.company_id ?? data.companyId),
    productId: text(data.product_id ?? data.productId),
    productName: text(data.product_name ?? data.productName),
    optionName: text(data.option_name ?? data.optionName, "default"),
    quantity,
    unitPrice,
    lineAmount: number(data.line_amount, quantity * unitPrice),
    deliveryStatus: text(data.delivery_status ?? data.deliveryStatus, "invoice_pending"),
    settlementAmount: number(data.settlement_amount ?? data.settlementAmount),
    sheetNo: optionalText(data.sheet_no),
    carrierCode: optionalText(data.carrier_code),
  };
}

function normalizeOrderStatus(value: unknown): IntegrationOrderStatus {
  const status = String(value ?? "");
  if (status === "ready_for_pickup") return "ready_to_ship";
  if (status === "shipping") return "shipping";
  if (status === "delivered" || status === "picked_up") return "delivered";
  if (status === "cancelled") return "cancelled";
  if (status === "refund_requested") return "return_requested";
  if (status === "refunded") return "returned";
  return "paid";
}

function deliveryStatusFor(status: IntegrationOrderStatus) {
  if (status === "ready_to_ship") return "invoice_pending";
  if (status === "shipping") return "in_transit";
  if (status === "delivered") return "delivered";
  return status;
}

function orderStatusFor(status: IntegrationOrderStatus) {
  if (status === "ready_to_ship") return "ready_for_pickup";
  if (status === "return_requested") return "refund_requested";
  if (status === "returned") return "refunded";
  return status;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getKey(item);
    map.set(key, [...(map.get(key) ?? []), item]);
  }

  return map;
}

function text(value: unknown, fallback = "") {
  const result = String(value ?? "").trim();
  return result || fallback;
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || undefined;
}

function number(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 100);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
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
