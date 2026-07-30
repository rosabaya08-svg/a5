import { createHash, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import {
  AccessHttpError,
  asRecord,
  firestoreDocumentId,
  safeDocumentId,
  sendAccessError,
  text,
} from "../access/policy";
import { assertFeatureFlags, writeIntegrationLog } from "./runtimeV2";
import { assertStoredSubmerchantReady } from "./cartApiV12";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 30 };

type CartItem = {
  productId: string;
  optionId: string;
  productName: string;
  optionName: string;
  quantity: number;
  companyId: string;
};

function integer(value: unknown, name: string, min = 0, max = 1_000_000_000): number {
  const result = Number(value);
  if (!Number.isInteger(result) || result < min || result > max) {
    throw new AccessHttpError(400, "PAYUP_QR_VALUE_INVALID", `${name} 값이 올바르지 않습니다.`);
  }
  return result;
}

function boolEnv(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function normalizeItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.map((raw, index) => {
    const item = asRecord(raw);
    return {
      productId: firestoreDocumentId(item.productId ?? item.product_id, `items[${index}].productId`),
      optionId: text(item.optionId ?? item.option_id, 160),
      productName: text(item.productName ?? item.product_name, 200),
      optionName: text(item.optionName ?? item.option_name, 200) || "기본 옵션",
      quantity: integer(item.quantity, `items[${index}].quantity`, 1, 100_000),
      companyId: text(item.companyId ?? item.company_id, 160),
    };
  });
}

function normalizeDistributionTemplates(value: unknown, productId: string) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new AccessHttpError(409, "PAYUP_PRODUCT_DISTRIBUTION_NOT_READY", `${productId} 상품의 PayUp 차액분배 정책이 없습니다.`);
  }
  return value.map((raw, index) => {
    const line = asRecord(raw);
    const subMerchantId = text(line.sub_merchant_id ?? line.subMerchantId, 20);
    const amountPerUnit = integer(line.amount_per_unit ?? line.amountPerUnit, `${productId}.distribution[${index}].amountPerUnit`, 1);
    if (!subMerchantId) {
      throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_REQUIRED", `${productId} 상품 분배행 ${index + 1}의 subMerchantId가 없습니다.`);
    }
    return {
      lineType: text(line.line_type ?? line.lineType, 80).toUpperCase() || "PRODUCT_AMOUNT",
      subMerchantId,
      organizationId: text(line.organization_id ?? line.organizationId, 160),
      businessNumber: text(line.business_number ?? line.businessNumber, 20).replace(/[^0-9]/g, ""),
      amountPerUnit,
    };
  });
}

function randomCode() {
  return `P${randomUUID().replaceAll("-", "").slice(0, 9).toUpperCase()}`;
}

function clientFingerprint(request: { get(name: string): string | undefined }, tabletId: string) {
  const forwarded = text(request.get("x-forwarded-for"), 300).split(",")[0]?.trim();
  const ip = forwarded || text(request.get("cf-connecting-ip"), 100) || "unknown";
  return createHash("sha256").update(`payup-qr|${tabletId}|${ip}`).digest("hex").slice(0, 48);
}

async function enforceRateLimit(request: { get(name: string): string | undefined }, tabletId: string) {
  const db = getAdminDb();
  const bucket = Math.floor(Date.now() / 60_000);
  const ref = db.doc(`payup_rate_limits/${safeDocumentId(`qr-${clientFingerprint(request, tabletId)}-${bucket}`)}`);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = Number(snapshot.data()?.count ?? 0);
    if (count >= 10) throw new AccessHttpError(429, "PAYUP_QR_RATE_LIMITED", "QR 생성 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
    transaction.set(ref, {
      count: count + 1,
      type: "QR_CREATE",
      tablet_id_hash: createHash("sha256").update(tabletId).digest("hex").slice(0, 32),
      expires_at_iso: new Date((bucket + 3) * 60_000).toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
  });
}

async function validateTabletAccess(request: { get(name: string): string | undefined }, input: { nurseryId: string; roomId: string; tabletId: string }) {
  const db = getAdminDb();
  const tabletRef = db.doc(`tablets/${firestoreDocumentId(input.tabletId, "tabletId")}`);
  const roomRef = db.doc(`rooms/${firestoreDocumentId(input.roomId, "roomId")}`);
  const nurseryRef = db.doc(`nurseries/${firestoreDocumentId(input.nurseryId, "nurseryId")}`);
  const [tablet, room, nursery] = await Promise.all([tabletRef.get(), roomRef.get(), nurseryRef.get()]);
  if (!tablet.exists || !room.exists || !nursery.exists) {
    throw new AccessHttpError(403, "PAYUP_TABLET_SCOPE_NOT_REGISTERED", "등록된 조리원·객실·태블릿에서만 PayUp QR을 만들 수 있습니다.");
  }
  const tabletData = tablet.data() ?? {};
  const roomData = room.data() ?? {};
  const tabletStatus = text(tabletData.status, 30).toLowerCase();
  if (tabletStatus && !["active", "approved"].includes(tabletStatus)) {
    throw new AccessHttpError(403, "PAYUP_TABLET_INACTIVE", "비활성 태블릿에서는 PayUp QR을 만들 수 없습니다.");
  }
  const tabletNursery = text(tabletData.nursery_id ?? tabletData.nurseryId, 160);
  const tabletRoom = text(tabletData.room_id ?? tabletData.roomId, 160);
  const roomNursery = text(roomData.nursery_id ?? roomData.nurseryId, 160);
  if ((tabletNursery && tabletNursery !== input.nurseryId) || (tabletRoom && tabletRoom !== input.roomId) || (roomNursery && roomNursery !== input.nurseryId)) {
    throw new AccessHttpError(403, "PAYUP_TABLET_SCOPE_MISMATCH", "태블릿·객실·조리원 범위가 일치하지 않습니다.");
  }

  const requireAuth = process.env.PAYUP_ENVIRONMENT === "production" || boolEnv("PAYUP_REQUIRE_TABLET_AUTH");
  if (!requireAuth) return;
  const authorization = request.get("authorization") ?? request.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) throw new AccessHttpError(401, "PAYUP_TABLET_AUTH_REQUIRED", "운영 PayUp QR 생성에는 TABLET_DEVICE Firebase 로그인이 필요합니다.");
  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(authorization.slice("Bearer ".length), true);
  } catch {
    throw new AccessHttpError(401, "PAYUP_TABLET_TOKEN_INVALID", "태블릿 로그인 토큰이 유효하지 않습니다.");
  }
  const roles = [decoded.role, decoded.a5_role, ...(Array.isArray(decoded.roles) ? decoded.roles : [])].map((value) => text(value, 100).toUpperCase());
  const permittedRole = roles.some((role) => ["TABLET_DEVICE", "NURSERY_ADMIN", "OPERATIONS_ADMIN", "SUPER_ADMIN"].includes(role));
  if (!permittedRole) throw new AccessHttpError(403, "PAYUP_TABLET_ROLE_DENIED", "PayUp QR 생성 권한이 없습니다.");
  if (roles.includes("TABLET_DEVICE") && (text(decoded.nursery_id, 160) !== input.nurseryId || text(decoded.room_id, 160) !== input.roomId || text(decoded.tablet_id, 160) !== input.tabletId)) {
    throw new AccessHttpError(403, "PAYUP_TABLET_TOKEN_SCOPE_MISMATCH", "TABLET_DEVICE 로그인 범위가 QR 요청 범위와 일치하지 않습니다.");
  }
}

async function uniqueShortCode() {
  const db = getAdminDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const shortCode = randomCode();
    const existing = await db.collection("qr_payment_sessions").where("short_code", "==", shortCode).limit(1).get();
    if (existing.empty) return shortCode;
  }
  throw new AccessHttpError(503, "PAYUP_QR_CODE_GENERATION_FAILED", "QR 코드 생성에 실패했습니다. 다시 시도해 주세요.");
}

export const payupQrCreate = onRequest(options, async (request, response) => {
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await assertFeatureFlags(["PAYUP_MASTER", "NEW_ORDER"]);
    const body = asRecord(request.body);
    const nurseryId = firestoreDocumentId(body.nurseryId ?? body.nursery_id, "nurseryId");
    const roomId = firestoreDocumentId(body.roomId ?? body.room_id, "roomId");
    const tabletId = firestoreDocumentId(body.tabletId ?? body.tablet_id, "tabletId");
    const cartId = text(body.cartId ?? body.cart_id, 200) || `cart-${randomUUID()}`;
    const items = normalizeItems(body.items);
    if (!items.length) throw new AccessHttpError(400, "PAYUP_QR_ITEMS_REQUIRED", "장바구니 상품이 필요합니다.");
    await Promise.all([validateTabletAccess(request, { nurseryId, roomId, tabletId }), enforceRateLimit(request, tabletId)]);

    const db = getAdminDb();
    const productRefs = items.map((item) => db.doc(`products/${item.productId}`));
    const productSnapshots = await db.getAll(...productRefs);
    const subMerchantIds = new Set<string>();
    let totalAmount = 0;
    const pricedItems = productSnapshots.map((snapshot, index) => {
      if (!snapshot.exists) throw new AccessHttpError(404, "PAYUP_PRODUCT_NOT_FOUND", `${items[index].productId} 상품을 찾을 수 없습니다.`);
      const product = snapshot.data() ?? {};
      const status = text(product.status, 30).toLowerCase();
      if (!["active", "approved"].includes(status)) throw new AccessHttpError(409, "PAYUP_PRODUCT_NOT_ACTIVE", `${items[index].productId} 상품이 판매중이 아닙니다.`);
      const unitPrice = integer(product.closed_mall_price ?? product.price, `${items[index].productId}.price`, 1);
      const inventory = integer(product.inventory ?? product.stock, `${items[index].productId}.inventory`, 0);
      const reserved = integer(product.reserved_inventory ?? 0, `${items[index].productId}.reservedInventory`, 0);
      if (inventory - reserved < items[index].quantity) throw new AccessHttpError(409, "PAYUP_OUT_OF_STOCK", `${items[index].productId} 상품 재고가 부족합니다.`);
      const templates = normalizeDistributionTemplates(product.payup_distribution_lines, items[index].productId);
      const unitDistributionTotal = templates.reduce((sum, line) => sum + line.amountPerUnit, 0);
      if (unitDistributionTotal !== unitPrice) {
        throw new AccessHttpError(409, "PAYUP_PRODUCT_DISTRIBUTION_MISMATCH", `${items[index].productId} 상품 분배합계가 판매가와 일치하지 않습니다.`);
      }
      templates.forEach((line) => subMerchantIds.add(line.subMerchantId));
      totalAmount += unitPrice * items[index].quantity;
      return {
        product_id: items[index].productId,
        option_id: items[index].optionId || null,
        product_name: text(product.title ?? product.name, 200) || items[index].productName,
        option_name: items[index].optionName,
        unit_price: unitPrice,
        quantity: items[index].quantity,
        company_id: text(product.company_id ?? items[index].companyId, 160),
        line_amount: unitPrice * items[index].quantity,
      };
    });

    const clientAmount = Number(body.clientAmount ?? body.client_amount);
    if (Number.isFinite(clientAmount) && clientAmount !== totalAmount) {
      throw new AccessHttpError(409, "PAYUP_QR_AMOUNT_MISMATCH", `서버 재계산금액 ${totalAmount}원이 화면 금액 ${clientAmount}원과 일치하지 않습니다.`);
    }
    const uniqueSubMerchantIds = [...subMerchantIds];
    const subSnapshots = await db.getAll(...uniqueSubMerchantIds.map((id) => db.doc(`payup_submerchants/${safeDocumentId(id)}`)));
    subSnapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_NOT_READY", `${uniqueSubMerchantIds[index]} 하위가맹점이 등록되지 않았습니다.`);
      assertStoredSubmerchantReady(snapshot.data(), uniqueSubMerchantIds[index], text(process.env.PAYUP_MERCHANT_ID, 100));
    });

    const shortCode = await uniqueShortCode();
    const qrSessionId = `payup-qr-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString();
    const deliveryMethod = text(body.deliveryMethod ?? body.delivery_method, 20) === "delivery" ? "delivery" : "pickup";
    const pickupLocation = asRecord(body.pickupLocation ?? body.pickup_location);
    const ref = db.doc(`qr_payment_sessions/${firestoreDocumentId(qrSessionId, "qrSessionId")}`);
    const auditRef = db.collection("audit_logs").doc();
    await db.runTransaction(async (transaction) => {
      transaction.create(ref, {
        id: qrSessionId,
        qr_session_id: qrSessionId,
        short_code: shortCode,
        cart_id: cartId,
        nursery_id: nurseryId,
        room_id: roomId,
        tablet_id: tabletId,
        type: "purchase",
        status: "active",
        payment_provider: "payup",
        payment_flow_status: "QR_READY",
        delivery_method: deliveryMethod,
        pickup_location: pickupLocation,
        items_snapshot: pricedItems,
        total_amount_snapshot: totalAmount,
        total_amount: totalAmount,
        currency: "KRW",
        expires_at: expiresAt,
        guest_read_enabled: true,
        guest_lookup_enabled: true,
        multi_submerchant_enabled: true,
        sub_merchant_count: subMerchantIds.size,
        source: "payup_qr_create",
        created_at: now.toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      });
      transaction.set(auditRef, {
        action: "PAYUP.QR.CREATED",
        target_type: "qr_payment_session",
        target_id: qrSessionId,
        provider: "payup",
        nursery_id: nurseryId,
        room_id: roomId,
        tablet_id: tabletId,
        total_amount: totalAmount,
        item_count: pricedItems.length,
        sub_merchant_count: subMerchantIds.size,
        secrets_redacted: true,
        created_at: FieldValue.serverTimestamp(),
        created_at_iso: now.toISOString(),
      });
    });
    await writeIntegrationLog({ operation: "PAYUP_QR_CREATE", path: "internal/qr_payment_sessions", responseCode: "QR_READY", responseMsg: "PayUp 다중 하위사업자 QR을 생성했습니다.", status: "success", orderNumber: shortCode });
    const customerPath = `/q/${encodeURIComponent(shortCode)}/checkout`;
    response.status(200).json({
      ok: true,
      provider: "payup",
      qrSessionId,
      shortCode,
      status: "active",
      totalAmount,
      expiresAt,
      itemCount: pricedItems.length,
      subMerchantCount: subMerchantIds.size,
      customerPath,
      session: {
        id: qrSessionId,
        shortCode,
        type: "purchase",
        status: "active",
        nurseryId,
        roomId,
        tabletId,
        cartId,
        createdAt: now.toISOString(),
        expiresAt,
        items: pricedItems.map((item) => ({
          productId: item.product_id,
          optionId: item.option_id ?? undefined,
          productName: item.product_name,
          optionName: item.option_name,
          unitPrice: item.unit_price,
          quantity: item.quantity,
          companyId: item.company_id,
        })),
        deliveryMethod,
        totalAmount,
        pickupLocation,
      },
    });
  } catch (error) {
    sendAccessError(response, error);
  }
});
