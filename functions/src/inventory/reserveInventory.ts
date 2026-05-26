import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import {
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CartItemInput,
  type HttpRequestLike,
  type HttpResponseLike,
  type InventoryRequest,
} from "../payments/types";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getInventoryTransactionPlan } from "../utils/firestoreTransaction";

export type InventoryReservationPlan = {
  mode: "transaction_ready";
  reserved: boolean;
  items: CartItemInput[];
  transactionSteps: string[];
};

export function reserveInventorySkeleton(items: CartItemInput[]): InventoryReservationPlan {
  return {
    mode: "transaction_ready",
    reserved: false,
    items,
    transactionSteps: getInventoryTransactionPlan("reserve"),
  };
}

export async function inventoryReserveHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<InventoryRequest>(request);
  const items = normalizeCartItems(body.items);
  const reservationId = String(body.reservationId ?? `reserve_${body.qrSessionId ?? "manual"}_${Date.now()}`);

  if (items.length === 0) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "INVENTORY_RESERVE_INPUT_INVALID",
        message: "At least one item is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  try {
    const db = getAdminDb();
    const reservationRef = db.collection("inventory_reservations").doc(reservationId);
    const auditRef = db.collection("audit_logs").doc();
    const productRefs = items.map((item) => db.collection("products").doc(item.productId));

    await db.runTransaction(async (transaction) => {
      const existingReservation = await transaction.get(reservationRef);
      const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

      if (existingReservation.exists) {
        throw new Error("INVENTORY_RESERVATION_DUPLICATE");
      }

      productSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) throw new Error(`PRODUCT_NOT_FOUND:${items[index].productId}`);

        const inventory = asNumber(snapshot.get("inventory") ?? snapshot.get("stock"), 0);
        const reservedInventory = asNumber(snapshot.get("reserved_inventory"), 0);
        const available = inventory - reservedInventory;

        if (available < items[index].quantity) {
          throw new Error(`OUT_OF_STOCK:${items[index].productId}`);
        }
      });

      transaction.set(reservationRef, {
        id: reservationId,
        reservation_id: reservationId,
        qr_session_id: body.qrSessionId ?? null,
        order_no: body.orderNo ?? null,
        payment_intent_id: body.paymentIntentId ?? null,
        status: "reserved_mock",
        items: items.map(toSnapshotItem),
        source: "firebase_functions_inventory_reserve",
        demo_read_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      });

      items.forEach((item, index) => {
        transaction.update(productRefs[index], {
          reserved_inventory: FieldValue.increment(item.quantity),
          updated_at: FieldValue.serverTimestamp(),
        });

        transaction.set(db.collection("inventory_movements").doc(), {
          reservation_id: reservationId,
          qr_session_id: body.qrSessionId ?? null,
          order_no: body.orderNo ?? null,
          payment_intent_id: body.paymentIntentId ?? null,
          product_id: item.productId,
          option_id: item.optionId ?? item.productId,
          company_id: item.companyId,
          type: "reserve",
          quantity: item.quantity,
          reason: body.reason ?? "payment_ready_reserve",
          source: "firebase_functions_inventory_reserve",
          demo_read_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        });
      });

      transaction.set(auditRef, {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: "inventory_reserve",
            target: reservationId,
            severity: "info",
            message: "Inventory reserve completed by Firebase Functions transaction.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    sendJson(response, 200, {
      ok: true,
      reservationId,
      status: "reserved_mock",
      firestoreTransactionPlan: getInventoryTransactionPlan("reserve"),
      message: "Inventory reserved in beta transaction. Real external inventory API was not called.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown inventory reserve error.";
    const [code, detail] = message.split(":");

    sendJson(response, code === "OUT_OF_STOCK" || code.endsWith("DUPLICATE") ? 409 : 503, {
      ok: false,
      error: {
        code,
        message: detail ? `${code}: ${detail}` : message,
        httpStatus: code === "OUT_OF_STOCK" || code.endsWith("DUPLICATE") ? 409 : 503,
      },
    });
  }
}

function toSnapshotItem(item: CartItemInput) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    company_id: item.companyId,
  };
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
