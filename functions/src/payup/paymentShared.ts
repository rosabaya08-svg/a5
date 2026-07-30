import { createCipheriv, createHash, randomBytes, randomUUID } from "crypto";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  firestoreDocumentId,
  safeDocumentId,
  text,
} from "../access/policy";
import { sha256 } from "./runtimeV2";
import { assertStoredSubmerchantReady } from "./cartApiV12";

export const PAYMENT_SESSION_TTL_MS = 15 * 60 * 1000;
export type JsonRecord = Record<string, unknown>;

export type DistributionTemplate = {
  lineType: string;
  subMerchantId: string;
  organizationId: string;
  businessNumber: string;
  amountPerUnit: number;
};

export type DistributionLine = DistributionTemplate & {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  amount: number;
};

export type QrItem = {
  productId: string;
  optionId: string;
  productName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  companyId: string;
};

export type PreparedPlan = {
  planId: string;
  qrSessionId: string;
  shortCode: string;
  orderNumber: string;
  totalAmount: number;
  items: QrItem[];
  lines: DistributionLine[];
  cartPayList: { subMerchantId: string; amount: string }[];
  nurseryId: string;
  roomId: string;
  tabletId: string;
  cartId: string;
  deliveryMethod: "pickup" | "delivery";
  pickupLocation: JsonRecord;
};

export type ReceiverSnapshot = {
  deliveryMethod: "pickup" | "delivery";
  address: string;
  addressDetail: string;
};

export type EncryptedPrivateSnapshot = {
  algorithm: "aes-256-gcm";
  iv: string;
  authTag: string;
  ciphertext: string;
  keyVersion: "v1";
};

export function encryptPrivateSnapshot(value: unknown, secret: string): EncryptedPrivateSnapshot {
  if (secret.length < 32) throw new AccessHttpError(409, "ORDER_PII_KEY_MISSING", "주문 개인정보 암호화 Secret이 준비되지 않았습니다.");
  const key = createHash("sha256").update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return {
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    keyVersion: "v1",
  };
}

export function maskAddress(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  return normalized.length <= 8 ? `${normalized.slice(0, 2)}***` : `${normalized.slice(0, 8)}***`;
}

export function maskCardNumber(value: unknown): string {
  const raw = text(value, 100);
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 10) return raw.slice(0, 30);
  return `${digits.slice(0, 6)}******${digits.slice(-4)}`;
}

export function publicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function publicTokenHash(token: string): string {
  return sha256(["payup-public-token", token]);
}

export function assertPublicSessionCredential(session: DocumentData, input: { clientToken?: string; authReturnState?: string }) {
  const clientToken = text(input.clientToken, 500);
  const authReturnState = text(input.authReturnState, 500);
  if (clientToken) {
    if (publicTokenHash(clientToken) !== text(session.client_token_hash, 100)) {
      throw new AccessHttpError(403, "PAYUP_CLIENT_TOKEN_INVALID", "결제세션 보안토큰이 일치하지 않습니다.");
    }
    return;
  }
  if (authReturnState) {
    if (publicTokenHash(authReturnState) !== text(session.auth_return_state_hash, 100)) {
      throw new AccessHttpError(403, "PAYUP_AUTH_RETURN_STATE_INVALID", "PayUp 인증복귀 상태값이 일치하지 않습니다.");
    }
    return;
  }
  throw new AccessHttpError(403, "PAYUP_SESSION_CREDENTIAL_REQUIRED", "결제세션 보안검증 값이 필요합니다.");
}

export function numberValue(value: unknown, fallback = 0): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

export function integer(value: unknown, name: string, min = 0, max = 1_000_000_000): number {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new AccessHttpError(409, "PAYUP_AMOUNT_INVALID", `${name} 값이 올바르지 않습니다.`);
  }
  return result;
}

export function toIso(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value && typeof value === "object") {
    const candidate = value as { toDate?: () => Date; seconds?: number };
    if (typeof candidate.toDate === "function") return candidate.toDate().toISOString();
    if (typeof candidate.seconds === "number") return new Date(candidate.seconds * 1000).toISOString();
  }
  return "";
}

export function normalizePayupDateTime(value: unknown): string {
  const raw = text(value, 50);
  if (/^\d{14}$/.test(raw)) {
    const iso = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}T${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}+09:00`;
    return Number.isNaN(Date.parse(iso)) ? new Date().toISOString() : iso;
  }
  return raw && !Number.isNaN(Date.parse(raw)) ? new Date(raw).toISOString() : new Date().toISOString();
}

export function makeOrderNumber(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const token = `${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `A5${token}${randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
}

function normalizeQrItems(value: unknown): QrItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      productId: firestoreDocumentId(item.product_id ?? item.productId, `items[${index}].productId`),
      optionId: text(item.option_id ?? item.optionId, 160),
      productName: text(item.product_name ?? item.productName, 200),
      optionName: text(item.option_name ?? item.optionName, 200) || "기본 옵션",
      quantity: integer(item.quantity, `items[${index}].quantity`, 1, 100_000),
      unitPrice: integer(item.unit_price ?? item.unitPrice, `items[${index}].unitPrice`, 0),
      companyId: text(item.company_id ?? item.companyId, 160),
    };
  });
}

function normalizeDistributionTemplates(value: unknown, productId: string): DistributionTemplate[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AccessHttpError(409, "PAYUP_PRODUCT_DISTRIBUTION_NOT_READY", `${productId} 상품의 payup_distribution_lines가 없습니다.`);
  }
  const templates = value.map((raw, index) => {
    const line = asRecord(raw);
    const subMerchantId = text(line.sub_merchant_id ?? line.subMerchantId, 20);
    if (!subMerchantId) throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_REQUIRED", `${productId} 상품 분배행 ${index + 1}의 subMerchantId가 없습니다.`);
    if (!/^[A-Za-z0-9]{1,20}$/.test(subMerchantId)) {
      throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_INVALID", `${productId} distribution row ${index + 1} has an invalid subMerchantId.`);
    }
    const businessNumber = text(line.business_number ?? line.businessNumber, 20).replace(/[^0-9]/g, "");
    if (!/^\d{10}$/.test(businessNumber)) {
      throw new AccessHttpError(409, "PAYUP_BUSINESS_NUMBER_REQUIRED", `${productId} distribution row ${index + 1} requires a 10-digit businessNumber.`);
    }
    return {
      lineType: text(line.line_type ?? line.lineType, 80).toUpperCase() || "PRODUCT_AMOUNT",
      subMerchantId,
      organizationId: text(line.organization_id ?? line.organizationId, 160),
      businessNumber,
      amountPerUnit: integer(line.amount_per_unit ?? line.amountPerUnit, `${productId}.distribution[${index}].amountPerUnit`, 1),
    };
  });
  return templates;
}

export function normalizeReceiver(value: unknown): ReceiverSnapshot {
  const receiver = asRecord(value);
  return {
    deliveryMethod: text(receiver.deliveryMethod ?? receiver.delivery_method, 20) === "delivery" ? "delivery" : "pickup",
    address: text(receiver.address, 300),
    addressDetail: text(receiver.addressDetail ?? receiver.address_detail, 300),
  };
}

export function publicFormFields(result: JsonRecord, paymentSessionId: string) {
  const allowed = [
    "GoodsName", "Amt", "MID", "EdiDate", "Moid", "SignData", "BuyerName", "ReturnURL", "PayMethod",
    "ReqReserved", "BuyerEmail", "TransType", "WapUrl", "IspCancelUrl", "SelectQuota", "SelectCardCode", "LogoImage",
  ];
  const fields: Record<string, string> = {};
  for (const key of allowed) fields[key] = text(result[key], 1000);
  fields.ReqReserved = paymentSessionId;
  fields.charset = "utf-8";
  return fields;
}

export function safeStoredFormFields(fields: Record<string, string>) {
  const safeKeys = ["MID", "Moid", "Amt", "EdiDate", "PayMethod", "TransType", "ReqReserved"];
  return safeKeys.reduce<Record<string, string>>((result, key) => {
    result[key] = text(fields[key], 500);
    return result;
  }, {});
}

function requestFingerprint(request: { get(name: string): string | undefined }, shortCode: string): string {
  const forwarded = text(request.get("x-forwarded-for"), 500).split(",")[0]?.trim();
  const client = forwarded || text(request.get("cf-connecting-ip"), 100) || "unknown";
  return sha256(["payup-order-rate", shortCode, client]).slice(0, 48);
}

export async function enforceOrderRateLimit(request: { get(name: string): string | undefined }, shortCode: string) {
  const db = getAdminDb();
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const ref = db.doc(`payup_rate_limits/${safeDocumentId(`${requestFingerprint(request, shortCode)}-${bucket}`)}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = numberValue(snapshot.data()?.count);
    if (count >= 5) throw new AccessHttpError(429, "PAYUP_RATE_LIMITED", "같은 QR의 결제 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    transaction.set(ref, { count: count + 1, short_code_hash: sha256([shortCode]).slice(0, 32), expires_at_iso: new Date((bucket + 2) * 10 * 60 * 1000).toISOString(), updated_at: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export async function findQrSession(input: { qrSessionId?: string; shortCode?: string }) {
  const db = getAdminDb();
  const qrSessionId = text(input.qrSessionId, 1500);
  if (qrSessionId) {
    const id = firestoreDocumentId(qrSessionId, "qrSessionId");
    const snapshot = await db.doc(`qr_payment_sessions/${id}`).get();
    if (snapshot.exists) return { id: snapshot.id, data: snapshot.data() ?? {} };
  }
  const shortCode = text(input.shortCode, 80);
  if (!shortCode) throw new AccessHttpError(400, "PAYUP_QR_REQUIRED", "qrSessionId 또는 shortCode가 필요합니다.");
  const snapshot = await db.collection("qr_payment_sessions").where("short_code", "==", shortCode).limit(1).get();
  if (snapshot.empty) throw new AccessHttpError(404, "PAYUP_QR_NOT_FOUND", "QR 결제 세션을 찾을 수 없습니다.");
  return { id: snapshot.docs[0].id, data: snapshot.docs[0].data() };
}

export async function calculateDistributionPlan(qrSessionId: string, qrData: DocumentData, orderNumber: string, merchantId: string): Promise<PreparedPlan> {
  const db = getAdminDb();
  const status = text(qrData.status, 30).toLowerCase();
  if (status !== "active") throw new AccessHttpError(409, "PAYUP_QR_NOT_ACTIVE", `결제 가능한 QR 상태가 아닙니다: ${status || "unknown"}`);
  const expiresAt = toIso(qrData.expires_at ?? qrData.expiresAt);
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) throw new AccessHttpError(409, "PAYUP_QR_EXPIRED", "QR 결제 세션이 만료됐습니다.");
  const items = normalizeQrItems(qrData.items_snapshot ?? qrData.items);
  if (!items.length) throw new AccessHttpError(409, "PAYUP_QR_ITEMS_EMPTY", "QR 결제 상품이 없습니다.");
  const productRefs = items.map((item) => db.doc(`products/${item.productId}`));
  const productSnapshots = await db.getAll(...productRefs);
  const lines: DistributionLine[] = [];
  let totalAmount = 0;

  productSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) throw new AccessHttpError(404, "PAYUP_PRODUCT_NOT_FOUND", `${items[index].productId} 상품을 찾을 수 없습니다.`);
    const product = snapshot.data() ?? {};
    const productStatus = text(product.status, 30).toLowerCase();
    if (!["active", "approved"].includes(productStatus)) throw new AccessHttpError(409, "PAYUP_PRODUCT_NOT_ACTIVE", `${items[index].productId} 상품이 판매중이 아닙니다.`);
    const unitPrice = integer(product.closed_mall_price ?? product.price, `${items[index].productId}.price`, 1);
    const templates = normalizeDistributionTemplates(product.payup_distribution_lines, items[index].productId);
    const templateUnitTotal = templates.reduce((sum, line) => sum + line.amountPerUnit, 0);
    if (templateUnitTotal !== unitPrice) throw new AccessHttpError(409, "PAYUP_PRODUCT_DISTRIBUTION_MISMATCH", `${items[index].productId} 상품 분배합계 ${templateUnitTotal}원이 판매가 ${unitPrice}원과 일치하지 않습니다.`);
    items[index].productName = text(product.title ?? product.name, 200) || items[index].productName;
    items[index].unitPrice = unitPrice;
    totalAmount += unitPrice * items[index].quantity;
    templates.forEach((template, templateIndex) => {
      lines.push({ ...template, id: safeDocumentId(`${orderNumber}-${items[index].productId}-${templateIndex + 1}`), productId: items[index].productId, productName: items[index].productName, quantity: items[index].quantity, amount: template.amountPerUnit * items[index].quantity });
    });
  });

  const qrTotal = integer(qrData.total_amount ?? qrData.totalAmount, "qr.totalAmount", 1);
  if (totalAmount !== qrTotal) throw new AccessHttpError(409, "PAYUP_QR_TOTAL_MISMATCH", `서버 재계산금액 ${totalAmount}원이 QR 금액 ${qrTotal}원과 일치하지 않습니다.`);
  const aggregated = new Map<string, number>();
  for (const line of lines) aggregated.set(line.subMerchantId, (aggregated.get(line.subMerchantId) ?? 0) + line.amount);
  const cartPayList = [...aggregated.entries()].map(([subMerchantId, amount]) => ({ subMerchantId, amount: String(amount) }));
  if (cartPayList.reduce((sum, line) => sum + Number(line.amount), 0) !== totalAmount) throw new AccessHttpError(409, "PAYUP_CARTPAY_SUM_MISMATCH", "cartPayList 합계가 승인금액과 일치하지 않습니다.");

  const subMerchantSnapshots = await db.getAll(...cartPayList.map((line) => db.doc(`payup_submerchants/${safeDocumentId(line.subMerchantId)}`)));
  subMerchantSnapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_NOT_READY", `${cartPayList[index].subMerchantId} 하위가맹점이 등록되지 않았습니다.`);
    assertStoredSubmerchantReady(snapshot.data(), cartPayList[index].subMerchantId, merchantId);
  });

  return {
    planId: safeDocumentId(`plan-${qrSessionId}-${randomUUID().slice(0, 8)}`),
    qrSessionId,
    shortCode: text(qrData.short_code ?? qrData.shortCode, 80),
    orderNumber,
    totalAmount,
    items,
    lines,
    cartPayList,
    nurseryId: text(qrData.nursery_id ?? qrData.nurseryId, 160),
    roomId: text(qrData.room_id ?? qrData.roomId, 160),
    tabletId: text(qrData.tablet_id ?? qrData.tabletId, 160),
    cartId: text(qrData.cart_id ?? qrData.cartId, 200),
    deliveryMethod: text(qrData.delivery_method ?? qrData.deliveryMethod, 20) === "delivery" ? "delivery" : "pickup",
    pickupLocation: asRecord(qrData.pickup_location ?? qrData.pickupLocation),
  };
}

export async function lockPlanAndReserve(input: {
  paymentSessionId: string;
  plan: PreparedPlan;
  buyerNameMasked: string;
  buyerEmailMasked: string;
  buyerPhoneMasked: string;
  receiverSummary: ReceiverSnapshot;
  privateSnapshotEncrypted: EncryptedPrivateSnapshot;
  clientTokenHash: string;
  authReturnStateHash: string;
  userAgent: "WM" | "WP";
}) {
  const db = getAdminDb();
  const sessionRef = db.doc(`payup_payment_sessions/${input.paymentSessionId}`);
  const qrRef = db.doc(`qr_payment_sessions/${input.plan.qrSessionId}`);
  const planRef = db.doc(`payment_distribution_plans/${input.plan.planId}`);
  const reservationRef = db.doc(`inventory_reservations/${input.paymentSessionId}`);
  const productRefs = input.plan.items.map((item) => db.doc(`products/${item.productId}`));

  await db.runTransaction(async (transaction) => {
    const qrSnapshot = await transaction.get(qrRef);
    const sessionSnapshot = await transaction.get(sessionRef);
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    if (!qrSnapshot.exists) throw new AccessHttpError(404, "PAYUP_QR_NOT_FOUND", "QR 결제 세션을 찾을 수 없습니다.");
    const qrData = qrSnapshot.data() ?? {};
    if (text(qrData.status, 30).toLowerCase() !== "active") throw new AccessHttpError(409, "PAYUP_QR_NOT_ACTIVE", "이미 처리됐거나 사용할 수 없는 QR입니다.");
    if (sessionSnapshot.exists) throw new AccessHttpError(409, "PAYUP_PAYMENT_SESSION_DUPLICATE", "이미 생성된 결제세션입니다.");
    if (text(qrData.active_payment_session_id, 1500)) throw new AccessHttpError(409, "PAYUP_QR_PAYMENT_IN_PROGRESS", "이 QR에서 다른 결제가 진행 중입니다.");

    productSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) throw new AccessHttpError(404, "PAYUP_PRODUCT_NOT_FOUND", `${input.plan.items[index].productId} 상품을 찾을 수 없습니다.`);
      const product = snapshot.data() ?? {};
      const unitPrice = integer(product.closed_mall_price ?? product.price, `${input.plan.items[index].productId}.price`, 1);
      if (unitPrice !== input.plan.items[index].unitPrice) throw new AccessHttpError(409, "PAYUP_PRICE_CHANGED", `${input.plan.items[index].productId} 상품가격이 변경됐습니다.`);
      const inventory = integer(product.inventory ?? product.stock, `${input.plan.items[index].productId}.inventory`, 0);
      const reserved = integer(product.reserved_inventory ?? 0, `${input.plan.items[index].productId}.reservedInventory`, 0);
      if (inventory - reserved < input.plan.items[index].quantity) throw new AccessHttpError(409, "PAYUP_OUT_OF_STOCK", `${input.plan.items[index].productId} 상품 재고가 부족합니다.`);
      transaction.set(productRefs[index], { reserved_inventory: reserved + input.plan.items[index].quantity, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    });

    const nowIso = new Date().toISOString();
    transaction.create(planRef, { id: input.plan.planId, provider: "payup", qr_session_id: input.plan.qrSessionId, short_code: input.plan.shortCode, payment_session_id: input.paymentSessionId, order_number: input.plan.orderNumber, status: "LOCKED", total_amount: input.plan.totalAmount, currency: "KRW", items: input.plan.items, lines: input.plan.lines, cart_pay_list: input.plan.cartPayList, locked_at: FieldValue.serverTimestamp(), locked_at_iso: nowIso, updated_at: FieldValue.serverTimestamp() });
    transaction.create(reservationRef, { id: input.paymentSessionId, provider: "payup", qr_session_id: input.plan.qrSessionId, distribution_plan_id: input.plan.planId, status: "RESERVED", items: input.plan.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })), reserved_at: FieldValue.serverTimestamp(), reserved_at_iso: nowIso, expires_at_iso: new Date(Date.now() + PAYMENT_SESSION_TTL_MS).toISOString() });
    transaction.create(sessionRef, {
      id: input.paymentSessionId,
      provider: "payup",
      status: "ORDER_CREATING",
      qr_session_id: input.plan.qrSessionId,
      short_code: input.plan.shortCode,
      nursery_id: input.plan.nurseryId,
      room_id: input.plan.roomId,
      tablet_id: input.plan.tabletId,
      cart_id: input.plan.cartId,
      pickup_location: input.plan.pickupLocation,
      distribution_plan_id: input.plan.planId,
      order_number: input.plan.orderNumber,
      amount: input.plan.totalAmount,
      buyer_name_masked: input.buyerNameMasked,
      buyer_email_masked: input.buyerEmailMasked,
      buyer_phone_masked: input.buyerPhoneMasked,
      receiver_summary: input.receiverSummary,
      private_snapshot_encrypted: input.privateSnapshotEncrypted,
      client_token_hash: input.clientTokenHash,
      auth_return_state_hash: input.authReturnStateHash,
      user_agent: input.userAgent,
      auth_attempt_count: 0,
      approval_attempt_count: 0,
      created_at: FieldValue.serverTimestamp(),
      created_at_iso: nowIso,
      expires_at_iso: new Date(Date.now() + PAYMENT_SESSION_TTL_MS).toISOString(),
    });
    transaction.set(qrRef, { active_payment_session_id: input.paymentSessionId, payment_state: "ORDER_CREATING", updated_at: FieldValue.serverTimestamp() }, { merge: true });
  });
}

export async function releaseReservation(
  paymentSessionIdValue: unknown,
  nextStatus: string,
  reason: string,
  provider?: { providerResponseCode?: string; providerResponseMsg?: string },
) {
  const paymentSessionId = firestoreDocumentId(paymentSessionIdValue, "paymentSessionId");
  const db = getAdminDb();
  const sessionRef = db.doc(`payup_payment_sessions/${paymentSessionId}`);
  const reservationRef = db.doc(`inventory_reservations/${paymentSessionId}`);
  await db.runTransaction(async (transaction) => {
    const sessionSnapshot = await transaction.get(sessionRef);
    const reservationSnapshot = await transaction.get(reservationRef);
    if (!sessionSnapshot.exists || !reservationSnapshot.exists) return;
    const reservation = reservationSnapshot.data() ?? {};
    if (text(reservation.status, 30) !== "RESERVED") return;
    const items = Array.isArray(reservation.items) ? reservation.items.map(asRecord) : [];
    const productRefs = items.map((item) => db.doc(`products/${firestoreDocumentId(item.product_id, "reservation.productId")}`));
    const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));
    productSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) return;
      const reserved = Math.max(0, numberValue(snapshot.data()?.reserved_inventory) - integer(items[index].quantity, "reservation.quantity", 1));
      transaction.set(productRefs[index], { reserved_inventory: reserved, updated_at: FieldValue.serverTimestamp() }, { merge: true });
    });
    const session = sessionSnapshot.data() ?? {};
    const qrSessionId = text(session.qr_session_id, 1500);
    const planId = text(session.distribution_plan_id, 180);
    transaction.set(reservationRef, { status: "RELEASED", released_reason: reason, released_at: FieldValue.serverTimestamp(), released_at_iso: new Date().toISOString() }, { merge: true });
    transaction.set(sessionRef, {
      status: nextStatus,
      last_error: reason.slice(0, 500),
      ...(provider?.providerResponseCode ? { provider_response_code: provider.providerResponseCode } : {}),
      ...(provider?.providerResponseMsg ? { provider_response_msg: provider.providerResponseMsg.slice(0, 500) } : {}),
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    }, { merge: true });
    if (planId) transaction.set(db.doc(`payment_distribution_plans/${safeDocumentId(planId)}`), { status: "ABORTED", abort_reason: reason.slice(0, 500), updated_at: FieldValue.serverTimestamp() }, { merge: true });
    if (qrSessionId) transaction.set(db.doc(`qr_payment_sessions/${firestoreDocumentId(qrSessionId, "qrSessionId")}`), { active_payment_session_id: FieldValue.delete(), payment_state: nextStatus, updated_at: FieldValue.serverTimestamp() }, { merge: true });
  });
}
