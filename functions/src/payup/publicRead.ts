import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import { enforceBrowserRequestGuards } from "../access/requestGuards";
import { AccessHttpError, asRecord, firestoreDocumentId, safeDocumentId, sendAccessError, text } from "../access/policy";
import { integer, numberValue, toIso } from "./paymentShared";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 40 };

function requestFingerprint(request: { get(name: string): string | undefined }, key: string) {
  const forwarded = text(request.get("x-forwarded-for"), 500).split(",")[0]?.trim();
  const ip = forwarded || text(request.get("cf-connecting-ip"), 100) || "unknown";
  return createHash("sha256").update(`payup-public-read|${key}|${ip}`).digest("hex").slice(0, 48);
}

async function rateLimit(request: { get(name: string): string | undefined }, key: string, max = 30) {
  const db = getAdminDb();
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const ref = db.doc(`payup_rate_limits/${safeDocumentId(`${requestFingerprint(request, key)}-${bucket}`)}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = numberValue(snapshot.data()?.count);
    if (count >= max) throw new AccessHttpError(429, "PAYUP_PUBLIC_READ_RATE_LIMITED", "조회 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    transaction.set(ref, { count: count + 1, type: "PUBLIC_READ", expires_at_iso: new Date((bucket + 2) * 10 * 60 * 1000).toISOString(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
  });
}

function safeQrSession(documentId: string, data: Record<string, unknown>) {
  const items = Array.isArray(data.items_snapshot) ? data.items_snapshot.map(asRecord) : [];
  const expiresAt = toIso(data.expires_at ?? data.expiresAt);
  let status = text(data.status, 30).toLowerCase();
  if (status === "active" && expiresAt && Date.parse(expiresAt) <= Date.now()) status = "expired";
  return {
    id: documentId,
    shortCode: text(data.short_code ?? data.shortCode, 80),
    type: "purchase",
    status,
    nurseryId: text(data.nursery_id ?? data.nurseryId, 160),
    roomId: text(data.room_id ?? data.roomId, 160),
    tabletId: text(data.tablet_id ?? data.tabletId, 160),
    cartId: text(data.cart_id ?? data.cartId, 200),
    createdAt: toIso(data.created_at ?? data.createdAt),
    expiresAt,
    deliveryMethod: text(data.delivery_method ?? data.deliveryMethod, 20) === "delivery" ? "delivery" : "pickup",
    totalAmount: integer(data.total_amount ?? data.totalAmount, "qr.totalAmount", 0),
    items: items.map((item, index) => ({
      productId: text(item.product_id ?? item.productId, 160) || `item-${index + 1}`,
      optionId: text(item.option_id ?? item.optionId, 160) || undefined,
      productName: text(item.product_name ?? item.productName, 200),
      optionName: text(item.option_name ?? item.optionName, 200),
      unitPrice: integer(item.unit_price ?? item.unitPrice, "qr.item.unitPrice", 0),
      quantity: integer(item.quantity, "qr.item.quantity", 1),
      companyId: text(item.company_id ?? item.companyId, 160),
    })),
    pickupLocation: asRecord(data.pickup_location ?? data.pickupLocation),
  };
}

export const payupPublicQrRead = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await enforceBrowserRequestGuards(request);
    const body = asRecord(request.body);
    const shortCode = text(body.shortCode, 80);
    if (!shortCode) throw new AccessHttpError(400, "PAYUP_QR_CODE_REQUIRED", "QR 코드가 필요합니다.");
    await rateLimit(request, `qr-${shortCode}`, 40);
    const snapshot = await getAdminDb().collection("qr_payment_sessions").where("short_code", "==", shortCode).limit(1).get();
    if (snapshot.empty) throw new AccessHttpError(404, "PAYUP_QR_NOT_FOUND", "QR 결제세션을 찾을 수 없습니다.");
    const document = snapshot.docs[0];
    response.status(200).json({ ok: true, provider: "payup", session: safeQrSession(document.id, document.data()) });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupPublicOrderRead = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await enforceBrowserRequestGuards(request);
    const body = asRecord(request.body);
    const orderNumber = firestoreDocumentId(body.orderNumber, "orderNumber");
    const phoneLast4 = text(body.phoneLast4, 4).replace(/[^0-9]/g, "");
    if (phoneLast4.length !== 4) throw new AccessHttpError(400, "ORDER_PHONE_LAST4_REQUIRED", "주문자 연락처 마지막 4자리가 필요합니다.");
    await rateLimit(request, `order-${orderNumber}`, 20);
    const db = getAdminDb();
    const [orderSnapshot, itemSnapshot] = await Promise.all([
      db.doc(`orders/${orderNumber}`).get(),
      db.collection("order_items").where("order_no", "==", orderNumber).limit(100).get(),
    ]);
    if (!orderSnapshot.exists || orderSnapshot.data()?.guest_lookup_enabled !== true) throw new AccessHttpError(404, "GUEST_ORDER_NOT_FOUND", "조회 가능한 주문을 찾을 수 없습니다.");
    const order = orderSnapshot.data() ?? {};
    const maskedPhone = text(order.customer_phone_masked ?? order.customerPhoneMasked, 30);
    if (!maskedPhone.endsWith(phoneLast4)) throw new AccessHttpError(403, "GUEST_ORDER_VERIFICATION_FAILED", "주문번호와 연락처가 일치하지 않습니다.");
    const items = itemSnapshot.docs.map((document) => {
      const item = document.data();
      return {
        id: document.id,
        productId: text(item.product_id, 160),
        productName: text(item.product_name, 200),
        optionName: text(item.option_name, 200),
        quantity: numberValue(item.quantity),
        unitPrice: numberValue(item.unit_price),
        lineAmount: numberValue(item.line_amount),
        deliveryStatus: text(item.delivery_status, 50),
      };
    });
    response.status(200).json({
      ok: true,
      provider: "payup",
      order: {
        orderNumber,
        status: text(order.status, 50),
        paymentStatus: text(order.payment_status, 50),
        transactionIdMasked: text(order.transaction_id, 100) ? `${text(order.transaction_id, 100).slice(0, 5)}***${text(order.transaction_id, 100).slice(-4)}` : "",
        totalAmount: numberValue(order.total_amount ?? order.totalAmount),
        customerName: text(order.customer_name ?? order.customerName, 100),
        customerPhoneMasked: maskedPhone,
        deliveryMethod: text(order.delivery_method, 20),
        receiverAddressMasked: text(order.receiver_address_masked, 300),
        receiverAddressDetailMasked: text(order.receiver_address_detail_masked, 300),
        paidAt: text(order.paid_at ?? order.paidAt, 50),
        cancelledAt: text(order.cancelled_at, 50),
        items,
      },
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});
