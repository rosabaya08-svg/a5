import { createHash, createHmac, randomUUID, timingSafeEqual } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  canonicalJson,
  firestoreDocumentId,
  safeDocumentId,
  sendAccessError,
  text,
} from "../access/policy";
import { assertFeatureFlags } from "./runtimeV2";

const REGION = "asia-northeast3";
export const A5LS_GATEWAY_HMAC_SECRET = defineSecret("A5LS_GATEWAY_HMAC_SECRET");
const options = { region: REGION, cors: false, maxInstances: 20, secrets: [A5LS_GATEWAY_HMAC_SECRET] };

type JsonRecord = Record<string, unknown>;

type SourceItem = {
  sourceProductId: string;
  mirrorProductId: string;
  productName: string;
  optionId: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  stock: number;
  companyId: string;
  distributionLines: {
    lineType: string;
    subMerchantId: string;
    organizationId: string;
    businessNumber: string;
    amountPerUnit: number;
  }[];
};

function integer(value: unknown, name: string, min = 0, max = 1_000_000_000) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) throw new AccessHttpError(400, "CHANNEL_VALUE_INVALID", `${name} 값이 올바르지 않습니다.`);
  return result;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function configuredReturnOrigins() {
  return new Set(
    `${process.env.A5_CHANNEL_RETURN_ORIGINS ?? ""},${process.env.A5_ALLOWED_PUBLIC_ORIGINS ?? ""}`
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function validatedReturnUrl(value: unknown, name: string) {
  const raw = text(value, 1000);
  if (!raw) return "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AccessHttpError(400, "CHANNEL_RETURN_URL_INVALID", `${name} URL이 올바르지 않습니다.`);
  }
  if (url.protocol !== "https:") throw new AccessHttpError(400, "CHANNEL_RETURN_URL_HTTPS_REQUIRED", `${name} URL은 HTTPS여야 합니다.`);
  const origins = configuredReturnOrigins();
  const production = process.env.PAYUP_ENVIRONMENT === "production";
  if ((production || origins.size > 0) && !origins.has(url.origin)) {
    throw new AccessHttpError(403, "CHANNEL_RETURN_ORIGIN_BLOCKED", `${name} Origin이 허용목록에 없습니다.`);
  }
  return url.toString();
}

async function verifyChannelRequest(request: { get(name: string): string | undefined }, body: JsonRecord) {
  const channel = text(request.get("x-a5-channel"), 30).toUpperCase();
  const timestamp = text(request.get("x-a5-timestamp"), 30);
  const nonce = text(request.get("x-a5-nonce"), 200);
  const signature = text(request.get("x-a5-signature"), 200);
  if (channel !== "A5LS") throw new AccessHttpError(403, "CHANNEL_GATEWAY_CHANNEL_DENIED", "허용되지 않은 중앙 Gateway 채널입니다.");
  if (!/^\d{13}$/.test(timestamp) || Math.abs(Date.now() - Number(timestamp)) > 5 * 60 * 1000) {
    throw new AccessHttpError(401, "CHANNEL_GATEWAY_TIMESTAMP_INVALID", "Gateway 요청시간이 만료됐습니다.");
  }
  if (!/^[A-Za-z0-9_-]{16,160}$/.test(nonce)) throw new AccessHttpError(401, "CHANNEL_GATEWAY_NONCE_INVALID", "Gateway nonce가 올바르지 않습니다.");
  const secret = A5LS_GATEWAY_HMAC_SECRET.value();
  if (secret.length < 32) throw new AccessHttpError(503, "CHANNEL_GATEWAY_SECRET_NOT_READY", "A5LS Gateway Secret이 준비되지 않았습니다.");
  const expected = hmac(`${timestamp}.${nonce}.${canonicalJson(body)}`, secret);
  if (!signature || !constantTimeEqual(signature, expected)) throw new AccessHttpError(401, "CHANNEL_GATEWAY_SIGNATURE_INVALID", "A5LS Gateway 서명이 일치하지 않습니다.");
  const nonceRef = getAdminDb().doc(`channel_gateway_nonces/${sha256(`${channel}|${nonce}`)}`);
  await getAdminDb().runTransaction(async (transaction) => {
    const snapshot = await transaction.get(nonceRef);
    if (snapshot.exists) throw new AccessHttpError(409, "CHANNEL_GATEWAY_REPLAY_BLOCKED", "이미 사용된 Gateway nonce입니다.");
    transaction.create(nonceRef, {
      channel,
      nonce_hash: sha256(nonce),
      created_at: FieldValue.serverTimestamp(),
      created_at_iso: new Date().toISOString(),
      expires_at_iso: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    });
  });
  return channel;
}

function normalizeDistributionLines(value: unknown, input: { sourceProductId: string; quantity: number; lineAmount: number; seller: JsonRecord }) {
  const source = Array.isArray(value) ? value : [];
  const lines = source.length ? source : [{
    lineType: "PRODUCT_AMOUNT",
    subMerchantId: input.seller.subMerchantId,
    organizationId: input.seller.organizationId,
    businessNumber: input.seller.businessNumber,
    amount: input.lineAmount,
  }];
  const normalized = lines.map((raw, index) => {
    const line = asRecord(raw);
    const amount = integer(line.amount, `${input.sourceProductId}.distribution[${index}].amount`, 1);
    if (amount % input.quantity !== 0) throw new AccessHttpError(409, "CHANNEL_DISTRIBUTION_UNIT_MISMATCH", `${input.sourceProductId} 분배금액은 수량으로 나누어 떨어져야 합니다.`);
    const subMerchantId = text(line.subMerchantId ?? line.sub_merchant_id, 20);
    if (!subMerchantId) throw new AccessHttpError(409, "CHANNEL_SUBMERCHANT_REQUIRED", `${input.sourceProductId} 분배행의 subMerchantId가 없습니다.`);
    return {
      lineType: text(line.lineType ?? line.line_type, 80).toUpperCase() || "PRODUCT_AMOUNT",
      subMerchantId,
      organizationId: text(line.organizationId ?? line.organization_id, 160),
      businessNumber: text(line.businessNumber ?? line.business_number, 20).replace(/[^0-9]/g, ""),
      amountPerUnit: amount / input.quantity,
    };
  });
  const total = normalized.reduce((sum, line) => sum + line.amountPerUnit * input.quantity, 0);
  if (total !== input.lineAmount) throw new AccessHttpError(409, "CHANNEL_PRODUCT_DISTRIBUTION_MISMATCH", `${input.sourceProductId} 분배합계 ${total}원이 상품금액 ${input.lineAmount}원과 일치하지 않습니다.`);
  return normalized;
}

function normalizeItems(value: unknown, seller: JsonRecord): SourceItem[] {
  if (!Array.isArray(value) || value.length === 0) throw new AccessHttpError(400, "CHANNEL_ITEMS_REQUIRED", "A5LS 주문상품이 필요합니다.");
  return value.map((raw, index) => {
    const item = asRecord(raw);
    const sourceProductId = firestoreDocumentId(item.productId ?? item.product_id, `items[${index}].productId`);
    const quantity = integer(item.quantity, `items[${index}].quantity`, 1, 1000);
    const unitPrice = integer(item.unitPrice ?? item.unit_price, `items[${index}].unitPrice`, 1);
    const lineAmount = unitPrice * quantity;
    return {
      sourceProductId,
      mirrorProductId: safeDocumentId(`a5ls-${sha256(sourceProductId).slice(0, 24)}`),
      productName: text(item.productName ?? item.name, 200) || sourceProductId,
      optionId: text(item.optionId ?? item.option_id, 160),
      optionName: text(item.optionName ?? item.option_name, 200) || "기본 옵션",
      quantity,
      unitPrice,
      stock: integer(item.stock, `items[${index}].stock`, quantity, 1_000_000),
      companyId: text(item.companyId ?? item.organizationId ?? seller.organizationId, 160),
      distributionLines: normalizeDistributionLines(item.distributionLines, { sourceProductId, quantity, lineAmount, seller }),
    };
  });
}

function syntheticItem(input: {
  sourceOrderNo: string;
  lineType: string;
  name: string;
  amount: number;
  recipient: JsonRecord;
}) : SourceItem {
  const sourceProductId = `__${input.lineType.toLowerCase()}__${input.sourceOrderNo}`;
  const subMerchantId = text(input.recipient.subMerchantId, 20);
  if (!subMerchantId) throw new AccessHttpError(409, "CHANNEL_SYNTHETIC_SUBMERCHANT_REQUIRED", `${input.lineType} 수취 subMerchantId가 없습니다.`);
  return {
    sourceProductId,
    mirrorProductId: safeDocumentId(`a5ls-${sha256(sourceProductId).slice(0, 24)}`),
    productName: input.name,
    optionId: "",
    optionName: "기본",
    quantity: 1,
    unitPrice: input.amount,
    stock: 1,
    companyId: text(input.recipient.organizationId, 160),
    distributionLines: [{
      lineType: input.lineType,
      subMerchantId,
      organizationId: text(input.recipient.organizationId, 160),
      businessNumber: text(input.recipient.businessNumber, 20).replace(/[^0-9]/g, ""),
      amountPerUnit: input.amount,
    }],
  };
}

async function uniqueShortCode() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortCode = `L${randomUUID().replaceAll("-", "").slice(0, 9).toUpperCase()}`;
    const existing = await getAdminDb().collection("qr_payment_sessions").where("short_code", "==", shortCode).limit(1).get();
    if (existing.empty) return shortCode;
  }
  throw new AccessHttpError(503, "CHANNEL_QR_CODE_FAILED", "A5LS 결제코드 생성에 실패했습니다.");
}

export const payupA5lsHandoff = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    const body = asRecord(request.body);
    await verifyChannelRequest(request, body);
    await assertFeatureFlags(["PAYUP_MASTER", "NEW_ORDER", "CART_DISTRIBUTION"]);
    const sourceOrderNo = firestoreDocumentId(body.sourceOrderNo, "sourceOrderNo");
    const sourceSite = text(body.sourceSite, 50).toLowerCase();
    if (sourceSite !== "a5ls") throw new AccessHttpError(403, "CHANNEL_SOURCE_SITE_INVALID", "A5LS sourceSite만 허용됩니다.");
    const seller = asRecord(body.seller);
    const sellerBusinessNumber = text(seller.businessNumber, 20).replace(/[^0-9]/g, "");
    if (!text(seller.organizationId, 160) || sellerBusinessNumber.length !== 10 || !text(seller.subMerchantId, 20)) {
      throw new AccessHttpError(400, "CHANNEL_SELLER_INVALID", "A5LS 판매자 organizationId·사업자번호·subMerchantId가 필요합니다.");
    }
    let items = normalizeItems(body.items, seller);
    const shippingFee = integer(body.shippingFee ?? 0, "shippingFee", 0);
    const systemFee = integer(body.systemFee ?? 0, "systemFee", 0);
    if (shippingFee > 0) items = [...items, syntheticItem({ sourceOrderNo, lineType: "SHIPPING_FEE", name: "배송비", amount: shippingFee, recipient: asRecord(body.shippingRecipient ?? seller) })];
    if (systemFee > 0) items = [...items, syntheticItem({ sourceOrderNo, lineType: "A5S_SYSTEM_FEE", name: "A5S 이용료", amount: systemFee, recipient: asRecord(body.systemFeeRecipient) })];
    const totalAmount = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    if (integer(body.totalAmount, "totalAmount", 1) !== totalAmount) throw new AccessHttpError(409, "CHANNEL_TOTAL_MISMATCH", `A5LS 주문총액과 중앙 재계산금액 ${totalAmount}원이 일치하지 않습니다.`);
    const successReturnUrl = validatedReturnUrl(body.successReturnUrl, "successReturnUrl");
    const failureReturnUrl = validatedReturnUrl(body.failureReturnUrl, "failureReturnUrl");

    const db = getAdminDb();
    const duplicate = await db.collection("qr_payment_sessions").where("source_channel", "==", "A5LS").where("source_order_no", "==", sourceOrderNo).limit(1).get();
    if (!duplicate.empty) {
      const existing = duplicate.docs[0].data();
      response.status(200).json({
        ok: true,
        duplicate: true,
        qrSessionId: duplicate.docs[0].id,
        shortCode: text(existing.short_code, 80),
        totalAmount: Number(existing.total_amount ?? 0),
        checkoutUrl: `/q/live?code=${encodeURIComponent(text(existing.short_code, 80))}`,
      });
      return;
    }

    const subMerchantIds = [...new Set(items.flatMap((item) => item.distributionLines.map((line) => line.subMerchantId)))];
    const subSnapshots = await db.getAll(...subMerchantIds.map((id) => db.doc(`payup_submerchants/${safeDocumentId(id)}`)));
    subSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists || !["ACTIVE", "APPROVED"].includes(text(snapshot.data()?.status, 30).toUpperCase())) {
        throw new AccessHttpError(409, "CHANNEL_SUBMERCHANT_NOT_READY", `${subMerchantIds[index]} 하위사업자가 활성 상태가 아닙니다.`);
      }
    });

    const shortCode = await uniqueShortCode();
    const qrSessionId = `payup-a5ls-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
    const productRefs = items.map((item) => db.doc(`products/${item.mirrorProductId}`));
    const existingProducts = await db.getAll(...productRefs);
    const batch = db.batch();
    items.forEach((item, index) => {
      const existing = existingProducts[index].data() ?? {};
      const reserved = Math.max(0, Number(existing.reserved_inventory ?? 0));
      batch.set(productRefs[index], {
        id: item.mirrorProductId,
        external_product_id: item.sourceProductId,
        title: item.productName,
        name: item.productName,
        status: "active",
        price: item.unitPrice,
        closed_mall_price: item.unitPrice,
        inventory: Math.max(item.stock, reserved),
        stock: Math.max(item.stock, reserved),
        reserved_inventory: reserved,
        company_id: item.companyId,
        source_channel: "A5LS",
        source_site: "a5ls",
        payup_distribution_lines: item.distributionLines.map((line) => ({
          line_type: line.lineType,
          sub_merchant_id: line.subMerchantId,
          organization_id: line.organizationId || null,
          business_number: line.businessNumber || null,
          amount_per_unit: line.amountPerUnit,
        })),
        updated_at: FieldValue.serverTimestamp(),
        updated_at_iso: new Date().toISOString(),
      }, { merge: true });
    });
    batch.create(db.doc(`qr_payment_sessions/${qrSessionId}`), {
      id: qrSessionId,
      qr_session_id: qrSessionId,
      short_code: shortCode,
      cart_id: `a5ls-${sourceOrderNo}`,
      source_channel: "A5LS",
      source_site: "a5ls",
      source_order_no: sourceOrderNo,
      source_host: text(body.sourceHost, 200),
      source_payload_hash: sha256(canonicalJson(body)),
      source_sync_status: "HANDOFF_ACCEPTED",
      status: "active",
      payment_state: "QR_ACTIVE",
      delivery_method: "delivery",
      items_snapshot: items.map((item) => ({
        product_id: item.mirrorProductId,
        source_product_id: item.sourceProductId,
        product_name: item.productName,
        option_id: item.optionId || null,
        option_name: item.optionName,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        company_id: item.companyId,
        line_amount: item.unitPrice * item.quantity,
      })),
      total_amount: totalAmount,
      currency: "KRW",
      success_return_url: successReturnUrl || null,
      failure_return_url: failureReturnUrl || null,
      guest_read_enabled: false,
      expires_at: expiresAt,
      created_at: FieldValue.serverTimestamp(),
      created_at_iso: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });
    batch.set(db.doc(`channel_order_links/${safeDocumentId(`A5LS-${sourceOrderNo}`)}`), {
      channel: "A5LS",
      source_order_no: sourceOrderNo,
      qr_session_id: qrSessionId,
      short_code: shortCode,
      total_amount: totalAmount,
      status: "HANDOFF_ACCEPTED",
      created_at: FieldValue.serverTimestamp(),
      created_at_iso: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });
    await batch.commit();

    response.status(200).json({
      ok: true,
      duplicate: false,
      provider: "payup",
      sourceChannel: "A5LS",
      sourceOrderNo,
      qrSessionId,
      shortCode,
      totalAmount,
      expiresAt,
      checkoutUrl: `/q/live?code=${encodeURIComponent(shortCode)}`,
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});

export const payupA5lsStatus = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    const body = asRecord(request.body);
    await verifyChannelRequest(request, body);
    const sourceOrderNo = firestoreDocumentId(body.sourceOrderNo, "sourceOrderNo");
    const link = await getAdminDb().doc(`channel_order_links/${safeDocumentId(`A5LS-${sourceOrderNo}`)}`).get();
    if (!link.exists) throw new AccessHttpError(404, "CHANNEL_ORDER_LINK_NOT_FOUND", "A5LS 중앙 결제 연결을 찾을 수 없습니다.");
    const linkData = link.data() ?? {};
    const qrSessionId = firestoreDocumentId(linkData.qr_session_id, "qrSessionId");
    const qr = await getAdminDb().doc(`qr_payment_sessions/${qrSessionId}`).get();
    const paymentSessionId = text(qr.data()?.active_payment_session_id ?? qr.data()?.payment_id, 1500);
    const payment = paymentSessionId ? await getAdminDb().doc(`payup_payment_sessions/${firestoreDocumentId(paymentSessionId, "paymentSessionId")}`).get() : null;
    const orderNumber = text(payment?.data()?.order_number ?? qr.data()?.order_no, 50);
    const order = orderNumber ? await getAdminDb().doc(`orders/${firestoreDocumentId(orderNumber, "orderNumber")}`).get() : null;
    const transactionId = text(payment?.data()?.transaction_id ?? order?.data()?.transaction_id, 100);
    response.status(200).json({
      ok: true,
      sourceChannel: "A5LS",
      sourceOrderNo,
      qrSessionId,
      shortCode: text(qr.data()?.short_code, 80),
      qrStatus: text(qr.data()?.status, 30),
      paymentSessionId: paymentSessionId || undefined,
      paymentStatus: text(payment?.data()?.status, 30) || undefined,
      centralOrderNumber: orderNumber || undefined,
      orderStatus: text(order?.data()?.status, 30) || undefined,
      transactionId: transactionId || undefined,
      transactionStatus: text(order?.data()?.payment_status, 30) || undefined,
      reconciliationStatus: text(payment?.data()?.reconciliation_status, 30) || undefined,
      cancelStatus: text(order?.data()?.cancel_status, 30) || undefined,
      totalAmount: Number(qr.data()?.total_amount ?? 0),
      updatedAt: text(payment?.data()?.updated_at_iso ?? order?.data()?.updated_at_iso ?? linkData.updated_at_iso, 50),
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});
