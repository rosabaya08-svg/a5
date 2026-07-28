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

export type InventoryReleasePlan = {
  mode: "transaction_ready";
  released: boolean;
  items: CartItemInput[];
  transactionSteps: string[];
};

export function releaseInventorySkeleton(items: CartItemInput[]): InventoryReleasePlan {
  return {
    mode: "transaction_ready",
    released: false,
    items,
    transactionSteps: getInventoryTransactionPlan("release"),
  };
}

export async function inventoryReleaseHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<InventoryRequest>(request);
  const items = normalizeCartItems(body.items);
  const reservationId = String(body.reservationId ?? "");

  if (!reservationId || items.length === 0) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "INVENTORY_RELEASE_INPUT_INVALID",
        message: "reservationId and at least one item are required.",
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
      const reservationSnapshot = await transaction.get(reservationRef);
      const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

      if (!reservationSnapshot.exists) {
        throw new Error("INVENTORY_RESERVATION_NOT_FOUND");
      }

      if (String(reservationSnapshot.get("status") ?? "") === "released_mock") {
        throw new Error("INVENTORY_RESERVATION_ALREADY_RELEASED");
      }

      productSnapshots.forEach((snapshot, index) => {
        if (!snapshot.exists) throw new Error(`PRODUCT_NOT_FOUND:${items[index].productId}`);
        const reservedInventory = asNumber(snapshot.get("reserved_inventory"), 0);
        if (reservedInventory < items[index].quantity) {
          throw new Error(`INVENTORY_RESERVE_UNDERFLOW:${items[index].productId}`);
        }
      });

      transaction.set(
        reservationRef,
        {
          status: "released_mock",
          released_reason: body.reason ?? "manual_or_payment_cancel_release",
          released_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      items.forEach((item, index) => {
        transaction.update(productRefs[index], {
          reserved_inventory: FieldValue.increment(-item.quantity),
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
          type: "release",
          quantity: item.quantity,
          reason: body.reason ?? "payment_cancel_or_expire_release",
          source: "firebase_functions_inventory_release",
          demo_read_enabled: true,
          created_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        });
      });

      transaction.set(auditRef, {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: "inventory_release",
            target: reservationId,
            severity: "info",
            message: "Inventory release completed by Firebase Functions transaction.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      });
    });

    sendJson(response, 200, {
      ok: true,
      reservationId,
      status: "released_mock",
      firestoreTransactionPlan: getInventoryTransactionPlan("release"),
      message: "Inventory reservation released in beta transaction. External inventory API was not called.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown inventory release error.";
    const [code, detail] = message.split(":");

    sendJson(response, code.endsWith("NOT_FOUND") ? 404 : 409, {
      ok: false,
      error: {
        code,
        message: detail ? `${code}: ${detail}` : message,
        httpStatus: code.endsWith("NOT_FOUND") ? 404 : 409,
      },
    });
  }
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
