import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type QueryConstraint,
} from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase/client";
import { calculateInfinySettlement } from "@/lib/payments/infinySettlementPolicy";
import type { CreateOrderFromQrInput, OrderItemListFilters, OrderListFilters, OrderRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";
import type { DeliveryMethod, Order, OrderItem } from "@/types/commerce";
import type { DeliveryStatus, OrderStatus } from "@/types/status";

const ordersCollection = "orders";
const orderItemsCollection = "order_items";

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asIsoDate(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };

    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString();
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return undefined;
}

function asOrderStatus(value: unknown): OrderStatus {
  const allowed: OrderStatus[] = [
    "pending_payment",
    "paid",
    "ready_for_pickup",
    "picked_up",
    "shipping",
    "delivered",
    "cancelled",
    "refund_requested",
    "refund_reviewed",
    "refund_approved_mock",
    "refund_rejected",
    "refunded",
  ];

  return allowed.includes(value as OrderStatus) ? (value as OrderStatus) : "pending_payment";
}

function asDeliveryStatus(value: unknown): DeliveryStatus {
  const allowed: DeliveryStatus[] = ["invoice_pending", "invoice_entered", "in_transit", "delivered", "pickup_ready", "picked_up"];
  return allowed.includes(value as DeliveryStatus) ? (value as DeliveryStatus) : "invoice_pending";
}

function asDeliveryMethod(value: unknown): DeliveryMethod {
  return value === "delivery" ? "delivery" : "pickup";
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function mapOrder(documentId: string, data: DocumentData): Order {
  return {
    id: asString(data.id ?? data.order_id, documentId),
    orderNo: asString(data.orderNo ?? data.order_no, documentId),
    qrSessionId: asString(data.qrSessionId ?? data.qr_session_id),
    nurseryId: asString(data.nurseryId ?? data.nursery_id),
    roomId: asString(data.roomId ?? data.room_id),
    customerName: asString(data.customerName ?? data.customer_name, "비회원 고객"),
    customerPhoneMasked: asString(data.customerPhoneMasked ?? data.customer_phone_masked, "010-****-0000"),
    status: asOrderStatus(data.status),
    deliveryMethod: asDeliveryMethod(data.deliveryMethod ?? data.delivery_method),
    totalAmount: asNumber(data.totalAmount ?? data.total_amount),
    paidAt: asIsoDate(data.paidAt ?? data.paid_at),
    createdAt: asIsoDate(data.createdAt ?? data.created_at) ?? new Date().toISOString(),
    itemIds: asStringArray(data.itemIds ?? data.item_ids),
  };
}

function mapOrderItem(documentId: string, data: DocumentData, orderIdFallback = ""): OrderItem {
  const quantity = asNumber(data.quantity, 1);
  const unitPrice = asNumber(data.unitPrice ?? data.unit_price);

  return {
    id: asString(data.id ?? data.order_item_id, documentId),
    orderId: asString(data.orderId ?? data.order_id, orderIdFallback),
    companyId: asString(data.companyId ?? data.company_id),
    productName: asString(data.productName ?? data.product_name),
    optionName: asString(data.optionName ?? data.option_name, "default"),
    quantity,
    unitPrice,
    deliveryStatus: asDeliveryStatus(data.deliveryStatus ?? data.delivery_status),
    settlementAmount: asNumber(data.settlementAmount ?? data.settlement_amount, calculateInfinySettlement(quantity * unitPrice).payoutAmount),
  };
}

async function getOrderDocByOrderNo(orderNo: string) {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", orderNo);
  }

  const direct = await getDoc(doc(db, ordersCollection, orderNo));

  if (direct.exists()) {
    return repositoryOk({ id: direct.id, data: direct.data() });
  }

  const snapshot = await getDocs(
    query(
      collection(db, ordersCollection),
      where("order_no", "==", orderNo),
      where("guest_lookup_enabled", "==", true),
      limit(1),
    ),
  );
  const found = snapshot.docs[0];

  if (!found) {
    return repositoryError("NOT_FOUND", "Firebase order not found.", orderNo);
  }

  return repositoryOk({ id: found.id, data: found.data() });
}

async function listItemsByOrderNo(orderNo: string, orderIdFallback = "") {
  const db = getFirebaseDb();

  if (!db) {
    return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", orderNo);
  }

  const snapshot = await getDocs(
    query(
      collection(db, orderItemsCollection),
      where("order_no", "==", orderNo),
      where("guest_lookup_enabled", "==", true),
    ),
  );
  return repositoryOk(snapshot.docs.map((item) => mapOrderItem(item.id, item.data(), orderIdFallback)));
}

function orderConstraints(filters?: OrderListFilters): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  if (filters?.status) constraints.push(where("status", "==", filters.status));
  return constraints;
}

export const firebaseOrderRepository: OrderRepository = {
  async listOrders(filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.");
    }

    try {
      const snapshot = await getDocs(query(collection(db, ordersCollection), ...orderConstraints(filters)));
      const orders = snapshot.docs
        .map((item) => mapOrder(item.id, item.data()))
        .filter((order) => {
          if (filters?.from && order.createdAt < filters.from) return false;
          if (filters?.to && order.createdAt > filters.to) return false;
          return true;
        });
      return repositoryOk(orders);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore order read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore orders read failed. ${message}`);
    }
  },

  async getOrderByOrderNo(orderNo) {
    try {
      const result = await getOrderDocByOrderNo(orderNo);

      if (!result.ok) {
        return result;
      }

      const order = mapOrder(result.data.id, result.data.data);
      const itemResult = await listItemsByOrderNo(order.orderNo, order.id);

      if (!itemResult.ok) {
        return itemResult;
      }

      return repositoryOk({
        order: {
          ...order,
          itemIds: itemResult.data.map((item) => item.id),
        },
        items: itemResult.data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore order read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore order read failed. ${message}`, orderNo);
    }
  },

  async listOrdersByNursery(nurseryId, filters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", nurseryId);
    }

    try {
      const snapshot = await getDocs(query(collection(db, ordersCollection), where("nursery_id", "==", nurseryId), ...orderConstraints(filters)));
      return repositoryOk(snapshot.docs.map((item) => mapOrder(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore nursery order read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore nursery orders read failed. ${message}`, nurseryId);
    }
  },

  async listOrderItemsByCompany(companyId, filters?: OrderItemListFilters) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", companyId);
    }

    try {
      const constraints: QueryConstraint[] = [where("company_id", "==", companyId)];
      if (filters?.deliveryStatus) constraints.push(where("delivery_status", "==", filters.deliveryStatus));
      const snapshot = await getDocs(query(collection(db, orderItemsCollection), ...constraints));
      return repositoryOk(snapshot.docs.map((item) => mapOrderItem(item.id, item.data())));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore company order item read error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore company order items read failed. ${message}`, companyId);
    }
  },

  async createOrderFromQrSnapshot(input: CreateOrderFromQrInput) {
    const db = getFirebaseDb();

    if (!db) {
      return repositoryError("EXTERNAL_BLOCKED", "Firebase web config is missing.", input.orderNo);
    }

    const order: Order = {
      id: input.orderNo,
      orderNo: input.orderNo,
      qrSessionId: input.qrSession.id,
      nurseryId: input.qrSession.nurseryId,
      roomId: input.qrSession.roomId,
      customerName: input.customerName,
      customerPhoneMasked: input.customerPhoneMasked,
      status: input.qrSession.deliveryMethod === "pickup" ? "ready_for_pickup" : "paid",
      deliveryMethod: input.qrSession.deliveryMethod,
      totalAmount: input.qrSession.totalAmount,
      paidAt: input.paidAt,
      createdAt: input.createdAt,
      itemIds: input.qrSession.items.map((_, index) => `${input.orderNo}-${index + 1}`),
    };
    const items: OrderItem[] = input.qrSession.items.map((item, index) => ({
      id: `${input.orderNo}-${index + 1}`,
      orderId: order.id,
      companyId: item.companyId,
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      deliveryStatus: input.qrSession.deliveryMethod === "pickup" ? "pickup_ready" : "invoice_pending",
      settlementAmount: calculateInfinySettlement(item.unitPrice * item.quantity).payoutAmount,
    }));

    try {
      await setDoc(doc(db, ordersCollection, order.orderNo), {
        ...order,
        order_no: order.orderNo,
        qr_session_id: order.qrSessionId,
        nursery_id: order.nurseryId,
        room_id: order.roomId,
        customer_name: order.customerName,
        customer_phone_masked: order.customerPhoneMasked,
        delivery_method: order.deliveryMethod,
        total_amount: order.totalAmount,
        paid_at: order.paidAt,
        created_at: order.createdAt,
        item_ids: order.itemIds,
        guest_lookup_enabled: true,
        payment_id: input.payment.id,
        payment_status: input.payment.status,
        source: "firebase_storefront",
        updated_at: serverTimestamp(),
      });

      await Promise.all(
        items.map((item) =>
          setDoc(doc(db, orderItemsCollection, item.id), {
            ...item,
            order_no: order.orderNo,
            order_id: order.id,
            company_id: item.companyId,
            product_name: item.productName,
            option_name: item.optionName,
            unit_price: item.unitPrice,
            delivery_status: item.deliveryStatus,
            settlement_amount: item.settlementAmount,
            nursery_id: order.nurseryId,
            room_id: order.roomId,
            guest_lookup_enabled: true,
            source: "firebase_storefront",
            updated_at: serverTimestamp(),
          }),
        ),
      );

      return repositoryOk({ order, items });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Firestore order write error.";
      return repositoryError("EXTERNAL_BLOCKED", `Firestore order create failed. ${message}`, input.orderNo);
    }
  },
};
