import crypto from "crypto";
import { FieldValue, type DocumentSnapshot, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { A5_CLOSED_MALL_SOURCE_SITE, a5MemberDocumentFields } from "../identity/source";
import {
  calculateItemsAmount,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CartItemInput,
  type HttpRequestLike,
  type HttpResponseLike,
} from "../payments/types";

const qrDisplayMinutes = 5;
const guestShopHours = 3;
const guestShopEntryTokenHeader = "x-a5-guest-shop-token";
const defaultA5PublicOrigin = "https://a5-closed-mall.pages.dev";
const blockedLegacyMockProductIds = new Set([
  "product-care-kit",
  "product-pillow",
  "product-bag",
  "product-robe",
  "product-tea",
  "product-snack",
  "product-blanket",
]);
const blockedLegacyMockCompanyIds = new Set(["company-sanho-care", "company-bebe-lux", "company-momtable"]);

export type GuestShopSession = {
  id: string;
  qrSessionId: string;
  shortCode: string;
  status: "active" | "expired" | "cancelled";
  expiresAt: string;
  entryTokenHash?: string;
  items: CartItemInput[];
  totalAmount: number;
  nurseryId: string;
  roomId: string;
  tabletId: string;
  deliveryMethod: "pickup" | "delivery";
  pickupLocation?: unknown;
};

type LookupInput = {
  shortCode?: string;
  qrSessionId?: string;
};

export async function guestShopClaimHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<{ code?: string; shortCode?: string; qrSessionId?: string; source?: string }>(request);
  const shortCode = optionalString(body.shortCode ?? body.code);
  const qrSessionId = optionalString(body.qrSessionId);

  if (!shortCode && !qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "GUEST_SHOP_CLAIM_INPUT_INVALID", message: "shortCode or qrSessionId is required.", httpStatus: 400 },
    });
    return;
  }

  const db = getAdminDb();
  const qrSnapshot = await findQrSessionDocument(db, { shortCode, qrSessionId });

  if (!qrSnapshot?.exists) {
    sendJson(response, 404, {
      ok: false,
      error: { code: "QR_SESSION_NOT_FOUND", message: "QR session was not found.", httpStatus: 404 },
    });
    return;
  }

  const qrData = qrSnapshot.data() ?? {};
  const status = String(qrData.status ?? "active");
  if (status !== "active") {
    sendJson(response, 409, {
      ok: false,
      error: { code: "QR_SESSION_NOT_ACTIVE", message: `QR session is ${status}.`, httpStatus: 409 },
    });
    return;
  }

  const now = new Date();
  const displayExpiresAt = resolveQrDisplayExpiresAt(qrData, now);
  if (displayExpiresAt.getTime() <= now.getTime()) {
    sendJson(response, 409, {
      ok: false,
      error: { code: "QR_DISPLAY_EXPIRED", message: "QR scan window expired. Create a new QR on the tablet.", httpStatus: 409 },
    });
    return;
  }

  const sessionId = `gss-${crypto.randomBytes(12).toString("hex")}`;
  const entryToken = makeGuestShopEntryToken();
  const expiresAt = new Date(now.getTime() + guestShopHours * 60 * 60 * 1000).toISOString();
  const items = normalizeCartItems(qrData.items_snapshot ?? qrData.items ?? []);
  const totalAmount = asNumber(qrData.total_amount_snapshot ?? qrData.totalAmount, calculateItemsAmount(items));
  const resolvedShortCode = optionalString(qrData.short_code ?? qrData.shortCode) ?? shortCode ?? qrSnapshot.id;
  const resolvedQrSessionId = optionalString(qrData.qr_session_id ?? qrData.qrSessionId ?? qrData.id) ?? qrSnapshot.id;
  const guestRef = db.collection("guest_shop_sessions").doc(sessionId);

  await db.runTransaction(async (transaction) => {
    transaction.set(guestRef, {
      id: sessionId,
      guest_shop_session_id: sessionId,
      qr_session_id: resolvedQrSessionId,
      short_code: resolvedShortCode,
      status: "active",
      items_snapshot: items.map(toSnapshotItem),
      total_amount_snapshot: totalAmount,
      nursery_id: optionalString(qrData.nursery_id ?? qrData.nurseryId) ?? "",
      room_id: optionalString(qrData.room_id ?? qrData.roomId) ?? "",
      tablet_id: optionalString(qrData.tablet_id ?? qrData.tabletId) ?? "",
      delivery_method: qrData.delivery_method === "delivery" || qrData.deliveryMethod === "delivery" ? "delivery" : "pickup",
      pickup_location: qrData.pickup_location ?? qrData.pickupLocation ?? null,
      ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
      source: "firebase_functions_guest_shop_claim",
      entry_source: normalizeEntrySource(body.source),
      entry_token_hash: hashGuestShopEntryToken(entryToken),
      entry_token_created_at: now.toISOString(),
      created_at: now.toISOString(),
      expires_at: expiresAt,
      updated_at: FieldValue.serverTimestamp(),
    });

    transaction.set(
      qrSnapshot.ref,
      {
        claimed_at: now.toISOString(),
        guest_shop_session_id: sessionId,
        qr_display_expires_at: displayExpiresAt.toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const shopPath = `/m/shop?sessionId=${encodeURIComponent(sessionId)}`;

  sendJson(response, 200, {
    ok: true,
    guestShopSessionId: sessionId,
    entryToken,
    qrSessionId: resolvedQrSessionId,
    shortCode: resolvedShortCode,
    expiresAt,
    shopUrl: buildCustomerUrl(request, shopPath),
    message: "Guest mobile shop session claimed.",
  });
}

export async function guestShopLookupHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for guest shop lookup.", httpStatus: 405 },
    });
    return;
  }

  const body = readObjectBody<{ guestShopSessionId?: string; sessionId?: string; entryToken?: string }>(request);
  const sessionId = optionalString(request.query?.guestShopSessionId ?? request.query?.sessionId ?? body.guestShopSessionId ?? body.sessionId);

  const access = await verifyGuestShopSessionAccess(sessionId, readGuestShopEntryToken(request, body));
  if (!access.ok) {
    sendJson(response, access.error.httpStatus, { ok: false, error: access.error });
    return;
  }

  sendJson(response, 200, { ok: true, session: toPublicGuestShopSession(access.session), source: "firebase_functions_guest_shop_lookup" });
}

export async function guestShopCartSaveHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<{ guestShopSessionId?: string; sessionId?: string; entryToken?: string; items?: unknown; clientAmount?: number }>(request);
  const sessionId = optionalString(body.guestShopSessionId ?? body.sessionId);
  const access = await verifyGuestShopSessionAccess(sessionId, readGuestShopEntryToken(request, body));
  if (!access.ok) {
    sendJson(response, access.error.httpStatus, { ok: false, error: access.error });
    return;
  }

  const resolvedSessionId = access.session.id;
  const session = access.session;
  const items = normalizeCartItems(body.items);
  const totalAmount = calculateItemsAmount(items);
  const now = new Date().toISOString();

  await getAdminDb().collection("guest_shop_carts").doc(resolvedSessionId).set(
    {
      id: resolvedSessionId,
      guest_shop_session_id: resolvedSessionId,
      qr_session_id: session.qrSessionId,
      short_code: session.shortCode,
      nursery_id: session.nurseryId,
      room_id: session.roomId,
      tablet_id: session.tabletId,
      items_snapshot: items.map(toSnapshotItem),
      total_amount_snapshot: totalAmount,
      client_amount_hint: typeof body.clientAmount === "number" ? body.clientAmount : null,
      status: "active",
      ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest" }),
      source: "firebase_functions_guest_shop_cart_save",
      updated_at_iso: now,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  sendJson(response, 200, {
    ok: true,
    guestShopSessionId: resolvedSessionId,
    items,
    totalAmount,
    updatedAt: now,
    source: "firebase_functions_guest_shop_cart_save",
  });
}

export async function guestShopCartLookupHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for guest shop cart lookup.", httpStatus: 405 },
    });
    return;
  }

  const body = readObjectBody<{ guestShopSessionId?: string; sessionId?: string; entryToken?: string }>(request);
  const sessionId = optionalString(request.query?.guestShopSessionId ?? request.query?.sessionId ?? body.guestShopSessionId ?? body.sessionId);
  const access = await verifyGuestShopSessionAccess(sessionId, readGuestShopEntryToken(request, body));
  if (!access.ok) {
    sendJson(response, access.error.httpStatus, { ok: false, error: access.error });
    return;
  }

  const resolvedSessionId = access.session.id;
  const session = access.session;
  const snapshot = await getAdminDb().collection("guest_shop_carts").doc(resolvedSessionId).get();
  const data = snapshot.data() ?? {};
  const items = snapshot.exists ? normalizeCartItems(data.items_snapshot) : session.items;

  sendJson(response, 200, {
    ok: true,
    guestShopSessionId: resolvedSessionId,
    items,
    totalAmount: calculateItemsAmount(items),
    updatedAt: toIsoString(data.updated_at_iso ?? data.updated_at),
    source: snapshot.exists ? "firebase_functions_guest_shop_cart_lookup" : "firebase_functions_guest_shop_session_cart_fallback",
  });
}

export async function readPublicStorefrontProducts(limit = 80) {
  const db = getAdminDb();
  const approvedCompanyIds = await readApprovedCompanyIds(db);
  const snapshot = await db.collection("products").where("status", "in", ["active", "approved"]).limit(limit).get();
  return sortGuestShopProducts(
    snapshot.docs
      .filter((doc) => isApprovedProductRecord(doc.data() ?? {}))
      .map((doc) => normalizeGuestShopProduct(toPublicProduct(doc.id, doc.data() ?? {})))
      .filter((product) => isGuestShopVisibleProduct(product, approvedCompanyIds)),
  );
}
export async function guestShopProductsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for guest shop products.", httpStatus: 405 },
    });
    return;
  }

  const session = await readSessionFromRequest(request);
  if (!session.ok) {
    sendJson(response, session.httpStatus, { ok: false, error: session.error });
    return;
  }

  const products = await readPublicStorefrontProducts();


  sendJson(response, 200, {
    ok: true,
    products,
    source: "firebase_functions_guest_shop_products",
  });
}

export async function readPublicStorefrontProductDetail(productId: string) {
  const db = getAdminDb();
  const productSnapshot = await db.collection("products").doc(productId).get();
  if (!productSnapshot.exists) return undefined;

  const data = productSnapshot.data() ?? {};
  const status = optionalString(data.status) ?? "";
  if (!["active", "approved"].includes(status) || !isApprovedProductRecord(data)) return undefined;

  const product = normalizeGuestShopProduct(toPublicProduct(productSnapshot.id, data));
  if (!isGuestShopVisibleProduct(product, await readApprovedCompanyIds(db))) return undefined;

  const optionSnapshot = await db.collection("product_options").where("product_id", "==", productId).limit(50).get();
  return {
    product,
    options: optionSnapshot.docs.map((doc) => toPublicProductOption(doc.id, doc.data() ?? {})),
  };
}

export async function guestShopProductDetailHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for guest shop product detail.", httpStatus: 405 },
    });
    return;
  }

  const session = await readSessionFromRequest(request);
  if (!session.ok) {
    sendJson(response, session.httpStatus, { ok: false, error: session.error });
    return;
  }

  const body = readObjectBody<{ productId?: string }>(request);
  const productId = optionalString(request.query?.productId ?? body.productId);
  if (!productId) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "GUEST_SHOP_PRODUCT_INPUT_INVALID", message: "productId is required.", httpStatus: 400 },
    });
    return;
  }

  const detail = await readPublicStorefrontProductDetail(productId);
  if (!detail) {
    sendJson(response, 404, {
      ok: false,
      error: { code: "PRODUCT_NOT_FOUND", message: "Product was not found.", httpStatus: 404 },
    });
    return;
  }
  sendJson(response, 200, {
    ok: true,
    ...detail,
    source: "firebase_functions_guest_shop_product_detail",
  });
}

export async function guestOrderLookupHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for guest order lookup.", httpStatus: 405 },
    });
    return;
  }

  const body = readObjectBody<{ orderNo?: string; token?: string; phone?: string; customerPhone?: string; phoneLast4?: string }>(request);
  const orderNo = optionalString(request.query?.orderNo ?? body.orderNo);
  const token = optionalString(request.query?.token ?? body.token);
  const phoneLast4 = last4FromPhone(request.query?.phoneLast4 ?? body.phoneLast4 ?? request.query?.phone ?? body.phone ?? request.query?.customerPhone ?? body.customerPhone);

  if (!orderNo && phoneLast4) {
    const db = getAdminDb();
    const snapshot = await db.collection("orders").where("customer_phone_last4", "==", phoneLast4).limit(20).get();
    const matchedOrders = snapshot.docs
      .filter((doc) => doc.get("guest_lookup_enabled") === true)
      .map((doc) => ({ id: doc.id, data: doc.data() ?? {} }))
      .sort((left, right) =>
        String(toIsoString(right.data.paid_at ?? right.data.paidAt) ?? "").localeCompare(String(toIsoString(left.data.paid_at ?? left.data.paidAt) ?? "")),
      )
      .slice(0, 10);
    const cancelRequestsByOrderNo = await readLatestCancelRequests(db, matchedOrders.map((order) => optionalString(order.data.order_no ?? order.data.orderNo) ?? order.id));
    const orders = matchedOrders.map((order) => {
      const nextOrderNo = optionalString(order.data.order_no ?? order.data.orderNo) ?? order.id;
      return toGuestOrder(order.id, order.data, cancelRequestsByOrderNo.get(nextOrderNo));
    });

    sendJson(response, 200, {
      ok: true,
      orders,
      phoneLast4,
      source: "firebase_functions_guest_order_lookup",
      message: orders.length
        ? "Orders matched by customer phone last 4 digits."
        : "No guest orders matched that phone number.",
    });
    return;
  }

  if (!orderNo || (!token && !phoneLast4)) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "GUEST_ORDER_LOOKUP_INPUT_INVALID", message: "orderNo and token, or a customer phone number, are required.", httpStatus: 400 },
    });
    return;
  }

  const db = getAdminDb();
  const orderSnapshot = await db.collection("orders").doc(orderNo).get();
  if (!orderSnapshot.exists || orderSnapshot.get("guest_lookup_enabled") !== true) {
    sendJson(response, 404, {
      ok: false,
      error: { code: "GUEST_ORDER_NOT_FOUND", message: "Order was not found.", httpStatus: 404 },
    });
    return;
  }

  const data = orderSnapshot.data() ?? {};
  const tokenOk = token && hashLookupToken(token) === optionalString(data.guest_lookup_token_hash);
  const phoneOk = phoneLast4 && phoneLast4 === optionalString(data.customer_phone_last4);

  if (!tokenOk && !phoneOk) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "GUEST_ORDER_LOOKUP_DENIED", message: "Order lookup verification failed.", httpStatus: 403 },
    });
    return;
  }

  const cancelRequestsByOrderNo = await readLatestCancelRequests(db, [orderNo]);
  const order = toGuestOrder(orderSnapshot.id, data, cancelRequestsByOrderNo.get(orderNo));

  sendJson(response, 200, {
    ok: true,
    order,
    orders: [order],
    phoneLast4,
    source: "firebase_functions_guest_order_lookup",
  });
}

export async function readGuestShopSession(sessionId: string): Promise<GuestShopSession | null> {
  const snapshot = await getAdminDb().collection("guest_shop_sessions").doc(sessionId).get();
  if (!snapshot.exists) return null;
  return toGuestShopSession(snapshot.id, snapshot.data() ?? {});
}

export function hashLookupToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function makeLookupToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

export function hashGuestShopEntryToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function makeGuestShopEntryToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function readGuestShopEntryToken(request: HttpRequestLike, body: { entryToken?: unknown; guestShopEntryToken?: unknown } = {}): string {
  return optionalString(
    request.get?.(guestShopEntryTokenHeader) ??
      request.get?.("X-A5-Guest-Shop-Token") ??
      request.query?.entryToken ??
      body.entryToken ??
      body.guestShopEntryToken,
  ) ?? "";
}

export async function verifyGuestShopSessionAccess(
  sessionId: string | undefined,
  entryToken: string,
): Promise<
  | { ok: true; session: GuestShopSession }
  | { ok: false; error: { code: string; message: string; httpStatus: number } }
> {
  if (!sessionId) {
    return {
      ok: false,
      error: { code: "GUEST_SHOP_SESSION_INPUT_INVALID", message: "guestShopSessionId or sessionId is required.", httpStatus: 400 },
    };
  }

  const session = await readGuestShopSession(sessionId);
  if (!session) {
    return {
      ok: false,
      error: { code: "GUEST_SHOP_SESSION_NOT_FOUND", message: "Guest shop session was not found.", httpStatus: 404 },
    };
  }

  if (session.status !== "active" || new Date(session.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      error: { code: "GUEST_SHOP_SESSION_EXPIRED", message: "입장시간이 만료 됐습니다. 사이니지를 통해서 상품 이어서 봐주세요.", httpStatus: 409 },
    };
  }

  if (!session.entryTokenHash || !entryToken) {
    return {
      ok: false,
      error: { code: "GUEST_SHOP_ENTRY_TOKEN_REQUIRED", message: "입장권한이 없습니다.", httpStatus: 403 },
    };
  }

  if (hashGuestShopEntryToken(entryToken) !== session.entryTokenHash) {
    return {
      ok: false,
      error: { code: "GUEST_SHOP_ENTRY_TOKEN_INVALID", message: "입장권한이 없습니다.", httpStatus: 403 },
    };
  }

  return { ok: true, session };
}

async function readSessionFromRequest(request: HttpRequestLike): Promise<
  | { ok: true; session: GuestShopSession }
  | { ok: false; httpStatus: number; error: { code: string; message: string; httpStatus: number } }
> {
  const body = readObjectBody<{ guestShopSessionId?: string; sessionId?: string; entryToken?: string }>(request);
  const sessionId = optionalString(request.query?.guestShopSessionId ?? request.query?.sessionId ?? body.guestShopSessionId ?? body.sessionId);
  const access = await verifyGuestShopSessionAccess(sessionId, readGuestShopEntryToken(request, body));
  return access.ok ? { ok: true, session: access.session } : { ok: false, httpStatus: access.error.httpStatus, error: access.error };
}

function normalizeEntrySource(source: unknown) {
  const value = optionalString(source);
  return value && ["checkout_more_products", "payment_success_more_products"].includes(value) ? value : "checkout_more_products";
}

function toPublicGuestShopSession(session: GuestShopSession): Omit<GuestShopSession, "entryTokenHash"> {
  const publicSession = { ...session } as Omit<GuestShopSession, "entryTokenHash"> & { entryTokenHash?: string };
  delete publicSession.entryTokenHash;
  return publicSession;
}

function toPublicProduct(documentId: string, data: Record<string, unknown>) {
  const comparison = asRecord(data.comparison);
  const closedMallPrice = asNumber(data.closed_mall_price ?? data.closedMallPrice ?? comparison.closedMallPrice, asNumber(data.price, 0));
  const platformLowestPrice = asNumber(data.platform_lowest_price ?? data.platformLowestPrice ?? comparison.platformLowestPrice, 0);
  const listPrice = asNumber(data.list_price ?? data.listPrice ?? comparison.listPrice, 0);
  const priceComparisonVerified =
    data.price_comparison_verified === true ||
    data.priceComparisonVerified === true ||
    comparison.verified === true;
  const priceComparisonStatus =
    optionalString(data.price_comparison_status ?? data.priceComparisonStatus ?? comparison.status) ??
    "pending_verification";
  const imageUrl = optionalString(data.image_url ?? data.imageUrl) ?? "/file.svg";

  return {
    id: optionalString(data.product_id ?? data.productId) ?? documentId,
    companyId: optionalString(data.company_id ?? data.companyId) ?? "company-unknown",
    sellerCompanyId: optionalString(data.seller_company_id ?? data.sellerCompanyId ?? data.pg_owner_company_id ?? data.company_id ?? data.companyId),
    sellerBusinessNo: optionalString(data.seller_business_no ?? data.sellerBusinessNo ?? data.company_business_no ?? data.companyBusinessNo ?? data.business_registration_number),
    sellerBusinessNoNormalized: normalizeBusinessNoValue(
      data.seller_business_no_normalized ??
        data.sellerBusinessNoNormalized ??
        data.company_business_no_normalized ??
        data.companyBusinessNoNormalized ??
        data.business_registration_number_normalized ??
        data.seller_business_no,
    ),
    sellerCompanyName: optionalString(data.seller_company_name ?? data.sellerCompanyName ?? data.company_name ?? data.companyName),
    nurseryId: optionalString(data.nursery_id ?? data.nurseryId) ?? "",
    name: optionalString(data.title ?? data.name) ?? "Untitled product",
    brand: optionalString(data.brand) ?? "A5 Partner",
    subtitle: optionalString(data.subtitle) ?? "",
    category: optionalString(data.category) ?? "uncategorized",
    status: "approved",
    price: closedMallPrice,
    stock: asNumber(data.inventory ?? data.stock, 0),
    externalProductCode: optionalString(data.external_product_code ?? data.externalProductCode),
    comparison: { listPrice, platformLowestPrice, closedMallPrice },
    priceComparisonVerified,
    priceComparisonStatus,
    optionIds: asStringArray(data.option_ids ?? data.optionIds),
    thumbnailTone: "sage",
    imageUrl,
    gallery: asStringArray(data.gallery).length ? asStringArray(data.gallery) : [imageUrl],
    tags: asStringArray(data.tags),
    badges: asStringArray(data.badges),
    fulfillment: {
      delivery: data.delivery_available ?? data.deliveryAvailable ?? true,
      pickup: data.pickup_available ?? data.pickupAvailable ?? true,
    },
  };
}

function normalizeGuestShopProduct(product: ReturnType<typeof toPublicProduct>) {
  return product;
}

async function readApprovedCompanyIds(db: Firestore) {
  const snapshot = await db.collection("companies").where("status", "in", ["active", "approved"]).limit(200).get();
  const ids = new Set<string>();

  for (const doc of snapshot.docs) {
    const data = doc.data() ?? {};
    const approvalStatus = optionalString(data.approval_status ?? data.approvalStatus) ?? "approved";
    if (approvalStatus !== "approved") continue;
    ids.add(optionalString(data.company_id ?? data.companyId) ?? doc.id);
  }

  return ids;
}

function isGuestShopVisibleProduct(product: ReturnType<typeof toPublicProduct>, approvedCompanyIds: Set<string>) {
  return (
    approvedCompanyIds.has(product.companyId) &&
    !blockedLegacyMockProductIds.has(product.id) &&
    !blockedLegacyMockCompanyIds.has(product.companyId)
  );
}

function isApprovedProductRecord(data: Record<string, unknown>) {
  const approvalStatus = optionalString(data.approval_status ?? data.approvalStatus);
  const productApprovalStatus = optionalString(data.product_approval_status ?? data.productApprovalStatus ?? approvalStatus);
  const companyApprovalStatus = optionalString(data.company_approval_status ?? data.companyApprovalStatus ?? approvalStatus);

  return productApprovalStatus === "approved" && companyApprovalStatus === "approved";
}

function sortGuestShopProducts(products: Array<ReturnType<typeof toPublicProduct>>) {
  return [...products].sort((left, right) => {
    const leftKey = guestShopProductSortKey(left);
    const rightKey = guestShopProductSortKey(right);
    return leftKey.localeCompare(rightKey, "ko-KR");
  });
}

function guestShopProductSortKey(product: ReturnType<typeof toPublicProduct>) {
  return [product.category, product.brand ?? "", product.name, product.id].join("|");
}

function toPublicProductOption(documentId: string, data: Record<string, unknown>) {
  return {
    id: optionalString(data.option_id ?? data.optionId) ?? documentId,
    productId: optionalString(data.product_id ?? data.productId) ?? "",
    name: optionalString(data.name ?? data.option_name ?? data.optionName) ?? "default",
    priceDelta: asNumber(data.price_delta ?? data.priceDelta, 0),
    stock: asNumber(data.stock ?? data.inventory, 0),
  };
}

function toGuestShopSession(id: string, data: Record<string, unknown>): GuestShopSession {
  const items = normalizeCartItems(data.items_snapshot ?? []);
  return {
    id,
    qrSessionId: optionalString(data.qr_session_id ?? data.qrSessionId) ?? "",
    shortCode: optionalString(data.short_code ?? data.shortCode) ?? "",
    status: data.status === "cancelled" || data.status === "expired" ? data.status : "active",
    expiresAt: toIsoString(data.expires_at ?? data.expiresAt) ?? new Date(0).toISOString(),
    entryTokenHash: optionalString(data.entry_token_hash ?? data.entryTokenHash),
    items,
    totalAmount: asNumber(data.total_amount_snapshot ?? data.totalAmount, calculateItemsAmount(items)),
    nurseryId: optionalString(data.nursery_id ?? data.nurseryId) ?? "",
    roomId: optionalString(data.room_id ?? data.roomId) ?? "",
    tabletId: optionalString(data.tablet_id ?? data.tabletId) ?? "",
    deliveryMethod: data.delivery_method === "delivery" || data.deliveryMethod === "delivery" ? "delivery" : "pickup",
    pickupLocation: data.pickup_location ?? data.pickupLocation ?? undefined,
  };
}

async function readLatestCancelRequests(db: Firestore, orderNos: string[]) {
  const uniqueOrderNos = [...new Set(orderNos.filter(Boolean))];
  const entries = await Promise.all(uniqueOrderNos.map(async (orderNo) => {
    const snapshot = await db.collection("cancel_requests").where("order_no", "==", orderNo).limit(20).get();
    const requests = snapshot.docs
      .map((doc) => toGuestCancelRequest(doc.id, doc.data() ?? {}))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

    return [orderNo, requests[0]] as const;
  }));

  return new Map(entries.filter((entry): entry is readonly [string, ReturnType<typeof toGuestCancelRequest>] => Boolean(entry[1])));
}

function toGuestCancelRequest(documentId: string, data: Record<string, unknown>) {
  return {
    id: documentId,
    status: optionalString(data.status) ?? "manual_review_required",
    amount: asNumber(data.amount, 0),
    reason: optionalString(data.reason),
    requestedBy: optionalString(data.requested_by ?? data.requestedBy),
    providerMessage: optionalString(data.provider_message ?? data.providerMessage ?? data.provider_block_reason),
    reviewMemo: optionalString(data.review_memo ?? data.reviewMemo),
    pgCancelCalled: data.pg_cancel_called === true,
    createdAt: toIsoString(data.created_at ?? data.createdAt) ?? new Date(0).toISOString(),
    reviewedAt: toIsoString(data.reviewed_at ?? data.reviewedAt),
  };
}

function toGuestOrder(documentId: string, data: Record<string, unknown>, cancelRequest?: ReturnType<typeof toGuestCancelRequest>) {
  return {
    orderNo: optionalString(data.order_no ?? data.orderNo) ?? documentId,
    status: optionalString(data.status) ?? "paid",
    totalAmount: asNumber(data.total_amount ?? data.totalAmount, 0),
    paidAt: toIsoString(data.paid_at ?? data.paidAt),
    deliveryMethod: data.delivery_method === "delivery" || data.deliveryMethod === "delivery" ? "delivery" : "pickup",
    receiverLocation: {
      address: optionalString(data.receiver_address),
      addressDetail: optionalString(data.receiver_address_detail),
    },
    customerPhoneMasked: optionalString(data.customer_phone_masked ?? data.customerPhoneMasked),
    items: normalizeCartItems(data.items_snapshot ?? []).map((item) => ({
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      companyId: item.companyId,
      sellerCompanyId: item.sellerCompanyId ?? item.companyId,
      sellerBusinessNo: item.sellerBusinessNo,
      sellerBusinessNoNormalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo,
      sellerCompanyName: item.sellerCompanyName,
      lineAmount: item.unitPrice * item.quantity,
    })),
    vendorContact: {
      companyId: optionalString(data.company_id),
      companyName: optionalString(data.company_name),
      phone: optionalString(data.company_public_contact_phone),
      kakaoChannel: optionalString(data.company_public_kakao_channel),
      email: optionalString(data.company_public_email),
    },
    cancelRequest,
  };
}

async function findQrSessionDocument(db: Firestore, input: LookupInput): Promise<DocumentSnapshot | null> {
  const collection = db.collection("qr_payment_sessions");
  const ids = [input.qrSessionId, input.shortCode, input.shortCode ? `qr-${input.shortCode}` : undefined].filter(Boolean) as string[];

  for (const id of ids) {
    const snapshot = await collection.doc(id).get();
    if (snapshot.exists) return snapshot;
  }

  for (const code of [input.shortCode, input.qrSessionId]) {
    const normalized = optionalString(code);
    if (!normalized) continue;
    const snapshot = await collection.where("short_code", "==", normalized).limit(1).get();
    if (snapshot.docs[0]?.exists) return snapshot.docs[0];
  }

  return null;
}

function resolveQrDisplayExpiresAt(data: Record<string, unknown>, now: Date): Date {
  const configured = toIsoString(data.qr_display_expires_at ?? data.qrDisplayExpiresAt);
  if (configured) return new Date(configured);

  const createdAt = toIsoString(data.created_at ?? data.createdAt);
  if (createdAt) return new Date(new Date(createdAt).getTime() + qrDisplayMinutes * 60 * 1000);

  const expiresAt = toIsoString(data.expires_at ?? data.expiresAt);
  if (expiresAt) return new Date(Math.min(new Date(expiresAt).getTime(), now.getTime() + qrDisplayMinutes * 60 * 1000));

  return new Date(now.getTime() + qrDisplayMinutes * 60 * 1000);
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

function buildCustomerUrl(request: HttpRequestLike, path: string): string {
  const configuredBase = (process.env.NEXT_PUBLIC_A5_PUBLIC_BASE_URL || process.env.A5_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const origin = request.get?.("origin")?.replace(/\/$/, "") ?? "";
  const base = configuredBase || origin || defaultA5PublicOrigin;
  return `${base}${path}`;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function normalizeBusinessNoValue(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
  return text ? text : undefined;
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const timestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function last4FromPhone(value: unknown): string | undefined {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length >= 4) return digits.slice(-4);
  const text = optionalString(value);
  return text && /^\d{4}$/.test(text) ? text : undefined;
}
