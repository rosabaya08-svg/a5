import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import {
  calculateItemsAmount,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CartItemInput,
  type HttpRequestLike,
  type HttpResponseLike,
  type OrderCreateRequest,
} from "../payments/types";
import { calculateCartShippingFee } from "../payments/shippingFee";
import { validateFirestoreQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getOrderCreateTransactionPlan } from "../utils/firestoreTransaction";
import { createOrderNumber } from "./orderNumber";

export type OrderSnapshotInput = {
  orderNo: string;
  qrSessionId: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  items: CartItemInput[];
  totalAmount: number;
  paidAt: string;
};

export type OrderItemSnapshot = CartItemInput & {
  lineTotal: number;
  qrSessionId: string;
  orderNo: string;
};

export type OrderSnapshotDraft = {
  orderNo: string;
  qrSessionId: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  totalAmount: number;
  paidAt: string;
  status: "paid_mock";
  items: OrderItemSnapshot[];
  writePlan: string[];
};

export function createOrderSnapshotDraft(input: OrderSnapshotInput): OrderSnapshotDraft {
  return {
    orderNo: input.orderNo,
    qrSessionId: input.qrSessionId,
    nurseryId: input.nurseryId,
    roomId: input.roomId,
    tabletId: input.tabletId,
    totalAmount: input.totalAmount,
    paidAt: input.paidAt,
    status: "paid_mock",
    items: input.items.map((item) => ({
      ...item,
      lineTotal: item.unitPrice * item.quantity,
      qrSessionId: input.qrSessionId,
      orderNo: input.orderNo,
    })),
    writePlan: [
      "Set orders/{orderNo} with paid status and payment snapshot.",
      "Set order_items/{orderNo}-{lineNo} per item for company settlement.",
      "Update qr_payment_sessions/{qrSessionId} to paid and one-time used.",
      "Append payments/{paymentIntentId} and audit_logs/{autoId}.",
    ],
  };
}

export async function ordersCreateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<OrderCreateRequest>(request);
  const qrSessionId = String(body.qrSessionId ?? "");

  if (!qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ORDER_CREATE_INPUT_INVALID",
        message: "qrSessionId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const qrValidation = await validateFirestoreQrSession(qrSessionId);
  if (!qrValidation.ok) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: qrValidation.code,
        message: qrValidation.message,
        httpStatus: 409,
      },
    });
    return;
  }

  const items = normalizeCartItems(body.items).length
    ? normalizeCartItems(body.items)
    : normalizeCartItems(qrValidation.session?.itemsSnapshot);

  if (items.length === 0) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ORDER_CREATE_ITEMS_REQUIRED",
        message: "At least one item is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const shippingFee = calculateCartShippingFee(items, {
    deliveryMethod: body.deliveryMethod === "delivery" ? "delivery" : "pickup",
    address: typeof body.receiverAddress === "string" ? body.receiverAddress : undefined,
  });
  const totalAmount = calculateItemsAmount(items) + shippingFee.totalFee;
  const amountAssertion = assertAmount(body.clientAmount ?? qrValidation.session?.totalAmountSnapshot, totalAmount);

  if (!amountAssertion.ok) {
    sendJson(response, amountAssertion.error.httpStatus, { ok: false, error: amountAssertion.error });
    return;
  }

  const now = new Date();
  const draftId = `draft_${qrSessionId}_${now.getTime()}`;
  const orderNoCandidate = createOrderNumber(now);
  const db = getAdminDb();
  const draftRef = db.collection("order_drafts").doc(draftId);
  const auditRef = db.collection("audit_logs").doc();

  await db.runTransaction(async (transaction) => {
    transaction.set(draftRef, {
      id: draftId,
      order_draft_id: draftId,
      order_no_candidate: orderNoCandidate,
      qr_session_id: qrSessionId,
      nursery_id: body.nurseryId ?? qrValidation.session?.nurseryId ?? null,
      room_id: body.roomId ?? qrValidation.session?.roomId ?? null,
      tablet_id: body.tabletId ?? qrValidation.session?.tabletId ?? null,
      payer_name: body.payerName ?? "Guest",
      payer_phone_masked: body.payerPhoneMasked ?? "010-****-0000",
      delivery_method: body.deliveryMethod ?? "pickup",
      total_amount_snapshot: totalAmount,
      product_subtotal_amount: shippingFee.productSubtotal,
      shipping_fee: shippingFee.totalFee,
      shipping_base_fee: shippingFee.baseFee,
      shipping_remote_area_fee: shippingFee.remoteAreaFee,
      shipping_area_type: shippingFee.areaType,
      currency: body.currency ?? "KRW",
      items_snapshot: items.map(toSnapshotItem),
      status: "draft_mock",
      source: "firebase_functions_order_create",
      demo_read_enabled: true,
      guest_lookup_enabled: true,
      created_at: now.toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });

    transaction.set(auditRef, {
      ...toAuditLogDocument(
        createAuditLogDraft({
          action: "order_draft_create",
          target: draftId,
          severity: "info",
          message: "Order draft snapshot created before PG confirm.",
        }),
      ),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    orderDraftId: draftId,
    orderNoCandidate,
    qrSessionId,
    totalAmount,
    status: "draft_mock",
    firestoreTransactionPlan: getOrderCreateTransactionPlan(),
    message: "Order draft created. Final order is still created only by /payments/confirm.",
  });
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
    seller_company_id: item.sellerCompanyId ?? item.companyId,
    pg_owner_company_id: item.sellerCompanyId ?? item.companyId,
    seller_business_no: item.sellerBusinessNo ?? null,
    seller_business_no_normalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo ?? null,
    seller_company_name: item.sellerCompanyName ?? null,
    shipping_fee_policy: item.shippingFeePolicy ?? null,
    line_amount: item.unitPrice * item.quantity,
  };
}
