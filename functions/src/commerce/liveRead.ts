import type { DocumentData, Query, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";
import { readLatestStorefrontRuntimeSnapshot } from "./storefrontSnapshot";

type LiveReadRequest = {
  repository?: string;
  method?: string;
  args?: unknown[];
};

type Doc = {
  id: string;
  data: Record<string, unknown>;
};

const masterAdminEmail = "rosabaya08@gmail.com";
const visibleProductStatuses = new Set(["active", "approved"]);
const visibleApprovalStatuses = new Set(["approved", "published", "live", ""]);

export async function commerceLiveReadHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "POST") {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for commerce live reads.", httpStatus: 405 },
    });
    return;
  }

  const authorized = await authorizeLiveRead(request);
  if (!authorized.ok) {
    sendJson(response, authorized.status, {
      ok: false,
      error: { code: authorized.code, message: authorized.message, httpStatus: authorized.status },
    });
    return;
  }

  const body = readObjectBody<LiveReadRequest>(request);
  const repository = text(body.repository);
  const method = text(body.method);
  const args = Array.isArray(body.args) ? body.args : [];

  try {
    const data = await dispatchRead(repository, method, args);
    sendJson(response, 200, {
      ok: true,
      source: "Firestore Admin SDK",
      repository,
      method,
      data,
    });
  } catch (error) {
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "COMMERCE_LIVE_READ_FAILED",
        message: error instanceof Error ? error.message : "Unknown commerce live read failure.",
        httpStatus: 500,
      },
    });
  }
}

async function authorizeLiveRead(request: HttpRequestLike) {
  const token = authorizationToken(request);
  const serverToken = process.env.A5_COMMERCE_LIVE_READ_TOKEN?.trim() || "";

  if (serverToken && token === serverToken) {
    return { ok: true as const };
  }

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      code: "COMMERCE_LIVE_READ_AUTH_REQUIRED",
      message: "A server live-read token or Firebase ID token is required.",
    };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed =
      role === "SUPER_ADMIN" ||
      role === "seed_admin" ||
      role === "COMPANY_ADMIN" ||
      role === "NURSERY_ADMIN" ||
      decoded.seed_admin === true ||
      email === masterAdminEmail;

    if (allowed) return { ok: true as const };
  } catch {
    // Return generic denial below.
  }

  return {
    ok: false as const,
    status: 403,
    code: "COMMERCE_LIVE_READ_FORBIDDEN",
    message: "The supplied token cannot read commerce live data.",
  };
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

async function dispatchRead(repository: string, method: string, args: unknown[]) {
  const key = `${repository}.${method}`;

  switch (key) {
    case "products.listProducts":
      return listProducts(asRecord(args[0]));
    case "products.listApprovedProducts":
      return listProducts({ ...asRecord(args[0]), status: "approved" });
    case "products.getProductById":
      return requireFound(await getProductById(text(args[0])), "Product not found.");
    case "products.listProductOptions":
    case "productOptions.listProductOptions":
      return listProductOptions(text(args[0]));
    case "products.listCompanyProducts":
      return listProducts({ ...asRecord(args[1]), companyId: text(args[0]), status: "approved" });
    case "productOptions.getProductOptionById":
      return requireFound(await getProductOptionById(text(args[0])), "Product option not found.");
    case "companies.listCompanies":
      return listCompanies(asRecord(args[0]));
    case "companies.getCompanyById":
      return requireFound(await getCompanyById(text(args[0])), "Company not found.");
    case "nurseries.listNurseries":
      return listNurseries(asRecord(args[0]));
    case "nurseries.getNurseryById":
      return requireFound(await getNurseryById(text(args[0])), "Nursery not found.");
    case "rooms.listRooms":
      return listRooms(asRecord(args[0]));
    case "rooms.listRoomsByNursery":
      return listRooms({ nurseryId: text(args[0]) });
    case "rooms.getRoomById":
      return requireFound(await getRoomById(text(args[0])), "Room not found.");
    case "tablets.listTablets":
      return listTablets(asRecord(args[0]));
    case "tablets.listTabletsByNursery":
      return listTablets({ nurseryId: text(args[0]) });
    case "tablets.getTabletById":
      return requireFound(await getTabletById(text(args[0])), "Tablet not found.");
    case "qrSessions.listQrSessions":
      return listQrSessions(asRecord(args[0]));
    case "qrSessions.listQrSessionsByRoomOrTablet":
      return listQrSessionsByRoomOrTablet(asRecord(args[0]));
    case "qrSessions.getQrSessionByShortCode":
      return requireFound(await getQrSessionByShortCode(text(args[0])), "QR session not found.");
    case "orders.listOrders":
      return listOrders(asRecord(args[0]));
    case "orders.getOrderByOrderNo":
      return getOrderWithItems(text(args[0]));
    case "orders.listOrdersByNursery":
      return listOrders({ ...asRecord(args[1]), nurseryId: text(args[0]) });
    case "orders.listOrderItemsByCompany":
      return listOrderItems({ ...asRecord(args[1]), companyId: text(args[0]) });
    case "orders.listOrderItemsByOrderNos":
      return listOrderItemsByOrderNos(asStringArray(args[0]));
    case "payments.listPayments":
      return listPayments();
    case "inventory.listInventoryMovements":
      return listInventoryMovements(asRecord(args[0]));
    case "auditLogs.listAuditLogs":
      return listAuditLogs(asRecord(args[0]));
    case "content.getStorefrontContent":
      return getStorefrontContent();
    case "content.getStorefrontRuntimeSnapshot":
      return getStorefrontRuntimeSnapshot();
    case "content.getProductProfileById":
      return requireFound(await getProductProfileById(text(args[0])), "Product profile not found.");
    case "content.listMarketingSlots":
      return listMarketingSlots(asRecord(args[0]));
    default:
      throw new Error(`Unsupported commerce live read: ${key}`);
  }
}

function requireFound<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}

function db() {
  return getAdminDb();
}

async function readCollection(collectionName: string, limit = 500): Promise<Doc[]> {
  const snapshot = await db().collection(collectionName).limit(limit).get();
  return snapshot.docs.map(toDoc);
}

async function readQuery(query: Query<DocumentData>): Promise<Doc[]> {
  const snapshot = await query.get();
  return snapshot.docs.map(toDoc);
}

function toDoc(document: QueryDocumentSnapshot<DocumentData>): Doc {
  return { id: document.id, data: document.data() as Record<string, unknown> };
}

function uniqueDocs(docs: Doc[]) {
  return [...new Map(docs.map((doc) => [doc.id, doc])).values()];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function healthyText(values: unknown[], fallback = "") {
  const match = values.find((value) => {
    const normalized = text(value);
    return Boolean(normalized) && !normalized.includes("?") && !normalized.includes("\uFFFD");
  });
  return text(match, fallback);
}

function firstBusinessNo(values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeBusinessNo(value);
    if (normalized) return normalized;
  }
  return "";
}

function numberValue(value: unknown, fallback = 0) {
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/,/g, "")) : NaN;
  return Number.isFinite(numeric) ? numeric : fallback;
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRecordArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function detailSections(value: unknown) {
  return asRecordArray(value)
    .map((section) => ({
      id: text(section.id),
      type: text(section.type),
      title: text(section.title),
      body: text(section.body),
      assetUrl: text(section.asset_url ?? section.assetUrl),
      assetPath: text(section.asset_path ?? section.assetPath),
      assetFileName: text(section.asset_file_name ?? section.assetFileName),
      sortOrder: numberValue(section.sort_order ?? section.sortOrder),
    }))
    .filter((section) => section.title || section.body || section.assetUrl);
}

function iso(value: unknown) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const timestamp = value as { seconds?: number; _seconds?: number; toDate?: () => Date };
    if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
    if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();
    if (typeof timestamp._seconds === "number") return new Date(timestamp._seconds * 1000).toISOString();
  }
  return undefined;
}

function normalizeBusinessNo(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function companyAliases(companyId: string) {
  const aliases = new Set<string>();
  const normalized = normalizeBusinessNo(companyId);
  if (normalized.length >= 10) aliases.add(normalized);
  return aliases;
}

function productBusinessNo(data: Record<string, unknown>) {
  const fields = [
    "business_no",
    "businessNo",
    "seller_business_no",
    "sellerBusinessNo",
    "seller_business_no_normalized",
    "sellerBusinessNoNormalized",
    "company_business_no",
    "companyBusinessNo",
    "company_business_no_normalized",
    "companyBusinessNoNormalized",
    "business_registration_number",
    "business_registration_number_normalized",
  ];
  for (const field of fields) {
    const value = normalizeBusinessNo(data[field]);
    if (value) return value;
  }
  return normalizeBusinessNo(data.brand);
}

function productCompanyId(documentId: string, data: Record<string, unknown>) {
  const explicit = text(data.company_id ?? data.companyId);
  if (explicit) return explicit;
  void documentId;
  return "company-unknown";
}

function productVisible(data: Record<string, unknown>) {
  const status = text(data.status, "active").toLowerCase();
  const approval = text(data.approval_status ?? data.approvalStatus, "").toLowerCase();
  const productApproval = text(data.product_approval_status ?? data.productApprovalStatus ?? approval, approval).toLowerCase();
  const companyApproval = text(data.company_approval_status ?? data.companyApprovalStatus ?? approval, approval).toLowerCase();
  return visibleProductStatuses.has(status) && visibleApprovalStatuses.has(productApproval) && visibleApprovalStatuses.has(companyApproval);
}

function productMatchesCompany(doc: Doc, companyId: string) {
  if (!companyId) return true;
  const data = doc.data;
  if (text(data.company_id ?? data.companyId) === companyId) return true;
  const businessNo = productBusinessNo(data);
  return Boolean(businessNo && companyAliases(companyId).has(businessNo));
}

async function listProducts(filters: Record<string, unknown>) {
  const docs = await readCollection("products", 1000);
  const statusFilter = text(filters.status);
  const categoryFilter = text(filters.category);
  const companyId = text(filters.companyId);

  return docs
    .filter((doc) => productVisible(doc.data))
    .filter((doc) => productMatchesCompany(doc, companyId))
    .map(mapProduct)
    .filter((product) => !statusFilter || product.status === statusFilter)
    .filter((product) => !categoryFilter || product.category === categoryFilter);
}

async function getProductById(productId: string) {
  if (!productId) return undefined;
  const snapshot = await db().collection("products").doc(productId).get();
  if (!snapshot.exists) return undefined;
  const doc = { id: snapshot.id, data: (snapshot.data() ?? {}) as Record<string, unknown> };
  return productVisible(doc.data) ? mapProduct(doc) : undefined;
}

function mapProduct(doc: Doc) {
  const data = doc.data;
  const comparison = asRecord(data.comparison);
  const closedMallPrice = numberValue(data.closed_mall_price ?? data.closedMallPrice ?? comparison.closedMallPrice ?? data.price);
  const platformLowestPrice = numberValue(
    data.platform_lowest_price ?? data.platformLowestPrice ?? data.open_mall_price ?? data.openMallPrice ?? comparison.platformLowestPrice,
    0,
  );
  const listPrice = numberValue(data.list_price ?? data.listPrice ?? comparison.listPrice, 0);
  const priceComparisonVerified = bool(
    data.price_comparison_verified ?? data.priceComparisonVerified ?? comparison.verified,
    false,
  );
  const priceComparisonStatus = text(
    data.price_comparison_status ?? data.priceComparisonStatus ?? comparison.status,
    "pending_verification",
  );
  const imageUrl = text(data.image_url ?? data.imageUrl, "/file.svg");
  return {
    id: text(data.product_id ?? data.productId, doc.id),
    companyId: productCompanyId(doc.id, data),
    sellerCompanyId: text(data.seller_company_id ?? data.sellerCompanyId ?? data.pg_owner_company_id) || productCompanyId(doc.id, data),
    sellerBusinessNo: productBusinessNo(data) || undefined,
    sellerBusinessNoNormalized: productBusinessNo(data) || undefined,
    sellerCompanyName: text(data.seller_company_name ?? data.sellerCompanyName ?? data.company_name ?? data.companyName) || undefined,
    nurseryId: text(data.nursery_id ?? data.nurseryId),
    name: text(data.title ?? data.name, "Untitled Firestore product"),
    brand: text(data.brand, "A5 Partner"),
    subtitle: text(data.subtitle),
    category: text(data.category, "uncategorized"),
    status: "approved",
    price: closedMallPrice,
    stock: numberValue(data.inventory ?? data.stock),
    externalProductCode: text(data.external_product_code ?? data.externalProductCode) || undefined,
    publicPath: text(data.public_path ?? data.publicPath) || undefined,
    tabletPath: text(data.tablet_path ?? data.tabletPath) || undefined,
    mobilePath: text(data.mobile_path ?? data.mobilePath) || undefined,
    canonicalUrl: text(data.canonical_url ?? data.canonicalUrl) || undefined,
    productUrl: text(data.product_url ?? data.productUrl) || undefined,
    adTargetPath: text(data.ad_target_path ?? data.adTargetPath) || undefined,
    mobileAdTargetPath: text(data.mobile_ad_target_path ?? data.mobileAdTargetPath) || undefined,
    businessBrandPath: text(data.business_brand_path ?? data.businessBrandPath ?? data.a5mall_brand_path) || undefined,
    businessProductPath: text(data.business_product_path ?? data.businessProductPath ?? data.a5mall_product_path) || undefined,
    businessBrandUrl: text(data.business_brand_url ?? data.businessBrandUrl) || undefined,
    businessProductUrl: text(data.business_product_url ?? data.businessProductUrl) || undefined,
    urlVersion: numberValue(data.url_version ?? data.urlVersion) || undefined,
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
      delivery: bool(data.delivery_available ?? data.deliveryAvailable, true),
      pickup: bool(data.pickup_available ?? data.pickupAvailable, true),
    },
    shippingFeePolicy: asRecord(data.shipping_fee_policy ?? data.shippingFeePolicy),
    detailSections: detailSections(data.detail_sections ?? data.detailSections),
    firebaseStatus: text(data.status, "active"),
    source: text(data.source, "firestore_admin_live_read"),
    seededAt: iso(data.seeded_at ?? data.seededAt),
  };
}

async function listProductOptions(productId: string) {
  if (!productId) return [];
  const ref = db().collection("product_options");
  const docs = uniqueDocs([
    ...(await readQuery(ref.where("product_id", "==", productId).limit(200))),
    ...(await readQuery(ref.where("productId", "==", productId).limit(200))),
  ]);
  return docs.filter((doc) => visibleProductStatuses.has(text(doc.data.status, "active"))).map(mapProductOption);
}

async function getProductOptionById(optionId: string) {
  if (!optionId) return undefined;
  const snapshot = await db().collection("product_options").doc(optionId).get();
  if (!snapshot.exists) return undefined;
  return mapProductOption({ id: snapshot.id, data: (snapshot.data() ?? {}) as Record<string, unknown> });
}

function mapProductOption(doc: Doc) {
  const data = doc.data;
  return {
    id: text(data.option_id ?? data.optionId, doc.id),
    productId: text(data.product_id ?? data.productId),
    name: text(data.name ?? data.option_name ?? data.optionName, "default"),
    priceDelta: numberValue(data.price_delta ?? data.priceDelta),
    stock: numberValue(data.stock ?? data.inventory),
  };
}

async function listCompanies(filters: Record<string, unknown>) {
  const status = text(filters.status);
  return (await readCollection("companies", 1000)).map(mapCompany).filter((company) => !status || company.status === status);
}

async function getCompanyById(companyId: string) {
  if (!companyId) return undefined;
  const snapshot = await db().collection("companies").doc(companyId).get();
  if (snapshot.exists) return mapCompany({ id: snapshot.id, data: (snapshot.data() ?? {}) as Record<string, unknown> });
  const normalized = normalizeBusinessNo(companyId);
  if (!normalized) return undefined;
  const found = (await readCollection("companies", 1000)).find((doc) => normalizeBusinessNo(doc.data.business_no ?? doc.data.businessNo) === normalized);
  return found ? mapCompany(found) : undefined;
}

function mapCompany(doc: Doc) {
  const data = doc.data;
  const profile = asRecord(data.pg_profile ?? data.pgProfile);
  const provider = text(data.pg_provider ?? profile.provider, "payup");
  const merchantId = text(data.payup_mid ?? data.pg_merchant_id ?? data.merchant_id ?? profile.merchantId ?? profile.merchant_id);
  const merchantStatus = merchantId ? "active" : text(data.payup_mid_status ?? data.pg_merchant_status ?? profile.merchantStatus, "not_applied");
  const status = text(data.status).toLowerCase();
  const approval = text(data.approval_status).toLowerCase();
  const businessRegistrationNumber = firstBusinessNo([
    data.business_registration_number,
    data.businessRegistrationNumber,
    data.business_no,
    data.businessNo,
    data.company_business_no,
    data.companyBusinessNo,
    doc.id,
  ]);
  return {
    id: text(data.company_id ?? data.companyId, doc.id),
    name: healthyText([data.name, data.company_name, data.companyName, data.brand_name, data.brandName], "업체명 확인 전"),
    businessRegistrationNumber: businessRegistrationNumber || undefined,
    businessRegistrationNumberNormalized: businessRegistrationNumber || undefined,
    representativeName: healthyText([data.representative_name, data.representativeName]) || undefined,
    managerName: healthyText([data.manager_name, data.managerName], "확인 전"),
    publicContactPhone: healthyText([data.public_contact_phone, data.publicContactPhone, data.cs_phone, data.csPhone, data.manager_phone, data.managerPhone, data.contact_phone, data.contactPhone]) || undefined,
    publicKakaoChannel: healthyText([data.public_kakao_channel, data.publicKakaoChannel]) || undefined,
    publicEmail: healthyText([data.public_email, data.publicEmail, data.manager_email, data.managerEmail, data.contact_email, data.contactEmail]) || undefined,
    commerceLicenseNo: healthyText([data.commerce_license_no, data.commerceLicenseNo, data.mail_order_registration_number, data.mailOrderRegistrationNumber]) || undefined,
    businessAddress: healthyText([data.business_address, data.businessAddress, data.company_address, data.companyAddress, data.address]) || undefined,
    returnAddress: healthyText([data.return_address, data.returnAddress]) || undefined,
    signupDocumentStatus: text(data.signup_document_upload_status ?? data.signupDocumentUploadStatus) || undefined,
    status: status === "suspended" ? "suspended" : status === "pending" || approval === "pending" || approval === "pending_review" ? "pending" : "approved",
    commissionRate: numberValue(data.commission_rate ?? data.commissionRate, 4.5),
    productCount: numberValue(data.product_count ?? data.productCount),
    pendingProductCount: numberValue(data.pending_product_count ?? data.pendingProductCount),
    settlementBlocked: bool(data.settlement_blocked ?? data.settlementBlocked, false),
    pgProfile: {
      provider,
      providerLabel: provider === "payup" ? "Payup" : provider,
      taxationType: "taxable",
      taxFreeEnabled: false,
      merchantId: merchantId || undefined,
      merchantIdMasked: merchantId ? mask(merchantId) : "not issued",
      moduleKey: text(data.payup_module_key ?? data.pg_module_key ?? profile.moduleKey ?? profile.module_key) || undefined,
      moduleKeyMasked: text(data.module_key_masked ?? profile.moduleKeyMasked ?? profile.module_key_masked) || undefined,
      merchantSerialNoMasked: text(data.merchant_serial_no_masked ?? profile.merchantSerialNoMasked ?? profile.merchant_serial_no_masked) || undefined,
      terminalIdMasked: text(data.terminal_id_masked ?? profile.terminalIdMasked ?? profile.terminal_id_masked) || undefined,
      credentialRefsStored: bool(data.credential_refs_stored ?? profile.credentialRefsStored ?? profile.credential_refs_stored, Boolean(merchantId)),
      merchantStatus,
      adminManaged: true,
      companyEditable: false,
      pgFeeRate: numberValue(data.pg_fee_rate ?? profile.pgFeeRate),
      platformFeeRate: numberValue(data.platform_fee_rate ?? profile.platformFeeRate, 4.5),
      totalFeeRate: numberValue(data.total_fee_rate ?? profile.totalFeeRate, 4.5),
      settlementOwner: "payup",
      settlementExecutionBlocked: true,
    },
  };
}

function mask(value: string) {
  if (value.length <= 4) return "****";
  return `${value.slice(0, 2)}***${value.slice(-2)}`;
}

async function listNurseries(filters: Record<string, unknown>) {
  const status = text(filters.status);
  const region = text(filters.region);
  return (await readCollection("nurseries", 1000))
    .map(mapNursery)
    .filter((nursery) => !status || nursery.status === status)
    .filter((nursery) => !region || nursery.region.includes(region));
}

async function getNurseryById(nurseryId: string) {
  if (!nurseryId) return undefined;
  const snapshot = await db().collection("nurseries").doc(nurseryId).get();
  return snapshot.exists ? mapNursery({ id: snapshot.id, data: (snapshot.data() ?? {}) as Record<string, unknown> }) : undefined;
}

function mapNursery(doc: Doc) {
  const data = doc.data;
  const status = text(data.status).toLowerCase();
  const approval = text(data.approval_status).toLowerCase();
  return {
    id: text(data.nursery_id ?? data.nurseryId, doc.id),
    name: text(data.name, "A5 nursery"),
    region: text(data.region),
    managerName: text(data.manager_name ?? data.managerName, "A5 nursery manager"),
    roomCount: numberValue(data.room_count ?? data.roomCount),
    tabletCount: numberValue(data.tablet_count ?? data.tabletCount),
    status: status === "suspended" ? "suspended" : status === "pending" || approval === "pending" || approval === "pending_review" ? "pending" : "approved",
  };
}

async function listRooms(filters: Record<string, unknown>) {
  const nurseryId = text(filters.nurseryId);
  const pickupFilter = typeof filters.pickupEnabled === "boolean" ? filters.pickupEnabled : undefined;
  return (await readCollection("rooms", 1000))
    .map(mapRoom)
    .filter((room) => !nurseryId || room.nurseryId === nurseryId)
    .filter((room) => pickupFilter === undefined || room.pickupEnabled === pickupFilter);
}

async function getRoomById(roomId: string) {
  if (!roomId) return undefined;
  const snapshot = await db().collection("rooms").doc(roomId).get();
  return snapshot.exists ? mapRoom({ id: snapshot.id, data: (snapshot.data() ?? {}) as Record<string, unknown> }) : undefined;
}

function mapRoom(doc: Doc) {
  const data = doc.data;
  return {
    id: text(data.room_id ?? data.roomId, doc.id),
    nurseryId: text(data.nursery_id ?? data.nurseryId),
    name: text(data.name ?? data.room_name ?? data.roomName, doc.id),
    floor: text(data.floor),
    pickupEnabled: bool(data.pickup_enabled ?? data.pickupEnabled, true),
    activeTabletId: text(data.active_tablet_id ?? data.activeTabletId) || undefined,
  };
}

async function listTablets(filters: Record<string, unknown>) {
  const nurseryId = text(filters.nurseryId);
  const roomId = text(filters.roomId);
  const status = text(filters.status);
  return (await readCollection("tablets", 1000))
    .map(mapTablet)
    .filter((tablet) => !nurseryId || tablet.nurseryId === nurseryId)
    .filter((tablet) => !roomId || tablet.roomId === roomId)
    .filter((tablet) => !status || tablet.status === status);
}

async function getTabletById(tabletId: string) {
  if (!tabletId) return undefined;
  const snapshot = await db().collection("tablets").doc(tabletId).get();
  return snapshot.exists ? mapTablet({ id: snapshot.id, data: (snapshot.data() ?? {}) as Record<string, unknown> }) : undefined;
}

function mapTablet(doc: Doc) {
  const data = doc.data;
  const status = text(data.status, "active");
  return {
    id: text(data.tablet_id ?? data.tabletId, doc.id),
    nurseryId: text(data.nursery_id ?? data.nurseryId),
    roomId: text(data.room_id ?? data.roomId),
    label: text(data.label ?? data.name, doc.id),
    status: status === "inactive" || status === "maintenance" ? status : "active",
    lastSeenAt: iso(data.last_seen_at ?? data.lastSeenAt) ?? new Date(0).toISOString(),
  };
}

async function listQrSessions(filters: Record<string, unknown>) {
  const status = text(filters.status);
  const nurseryId = text(filters.nurseryId);
  return (await readCollection("qr_payment_sessions", 1000))
    .map(mapQrSession)
    .filter((session) => !status || session.status === status)
    .filter((session) => !nurseryId || session.nurseryId === nurseryId);
}

async function listQrSessionsByRoomOrTablet(filters: Record<string, unknown>) {
  const nurseryId = text(filters.nurseryId);
  const roomIds = new Set(asStringArray(filters.roomIds));
  const tabletIds = new Set(asStringArray(filters.tabletIds));
  return (await listQrSessions({ nurseryId })).filter(
    (session) => (!roomIds.size || roomIds.has(session.roomId)) || (!tabletIds.size || tabletIds.has(session.tabletId)),
  );
}

async function getQrSessionByShortCode(shortCode: string) {
  if (!shortCode) return undefined;
  const direct = await db().collection("qr_payment_sessions").doc(shortCode).get();
  if (direct.exists) return mapQrSession({ id: direct.id, data: (direct.data() ?? {}) as Record<string, unknown> });
  const found = (await readQuery(db().collection("qr_payment_sessions").where("short_code", "==", shortCode).limit(1)))[0];
  return found ? mapQrSession(found) : undefined;
}

function mapQrSession(doc: Doc) {
  const data = doc.data;
  const items = normalizeCartItems(data.items_snapshot ?? data.items);
  return {
    id: doc.id,
    shortCode: text(data.short_code ?? data.shortCode, doc.id),
    type: text(data.type) === "ask" ? "ask" : "purchase",
    status: text(data.status, "active"),
    nurseryId: text(data.nursery_id ?? data.nurseryId),
    roomId: text(data.room_id ?? data.roomId),
    tabletId: text(data.tablet_id ?? data.tabletId),
    cartId: text(data.cart_id ?? data.cartId, doc.id),
    expiresAt: iso(data.expires_at ?? data.expiresAt) ?? new Date(0).toISOString(),
    qrDisplayExpiresAt: iso(data.qr_display_expires_at ?? data.qrDisplayExpiresAt),
    createdAt: iso(data.created_at ?? data.createdAt) ?? new Date(0).toISOString(),
    items,
    deliveryMethod: text(data.delivery_method ?? data.deliveryMethod) === "delivery" ? "delivery" : "pickup",
    totalAmount: numberValue(data.total_amount_snapshot ?? data.totalAmount ?? data.total_amount, sumItems(items)),
    pickupLocation: asRecord(data.pickup_location ?? data.pickupLocation),
  };
}

function normalizeCartItems(value: unknown) {
  return asRecordArray(value)
    .map((item) => ({
      productId: text(item.productId ?? item.product_id),
      optionId: text(item.optionId ?? item.option_id) || undefined,
      productName: text(item.productName ?? item.product_name),
      optionName: text(item.optionName ?? item.option_name, "default"),
      unitPrice: numberValue(item.unitPrice ?? item.unit_price),
      quantity: numberValue(item.quantity, 1),
      companyId: text(item.companyId ?? item.company_id),
    }))
    .filter((item) => item.productId || item.productName);
}

function sumItems(items: ReturnType<typeof normalizeCartItems>) {
  return items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
}

async function listOrders(filters: Record<string, unknown>) {
  const companyId = text(filters.companyId);
  const nurseryId = text(filters.nurseryId);
  const status = text(filters.status);
  const from = text(filters.from);
  const to = text(filters.to);
  return (await readCollection("orders", 1000))
    .map(mapOrder)
    .filter((order) => !nurseryId || order.nurseryId === nurseryId)
    .filter((order) => !status || order.status === status)
    .filter((order) => !from || order.createdAt >= from)
    .filter((order) => !to || order.createdAt <= to)
    .filter((order) => !companyId || order.companyId === companyId);
}

async function getOrderWithItems(orderNo: string) {
  const order = requireFound(await getOrderByOrderNo(orderNo), "Order not found.");
  const items = await listOrderItemsByOrderNos([order.orderNo]);
  return { order: { ...order, itemIds: items.map((item) => item.id) }, items };
}

async function getOrderByOrderNo(orderNo: string) {
  if (!orderNo) return undefined;
  const direct = await db().collection("orders").doc(orderNo).get();
  if (direct.exists) return mapOrder({ id: direct.id, data: (direct.data() ?? {}) as Record<string, unknown> });
  const found = (await readQuery(db().collection("orders").where("order_no", "==", orderNo).limit(1)))[0];
  return found ? mapOrder(found) : undefined;
}

function mapOrder(doc: Doc) {
  const data = doc.data;
  const items = normalizeCartItems(data.items_snapshot);
  return {
    id: text(data.id ?? data.order_id, doc.id),
    orderNo: text(data.orderNo ?? data.order_no, doc.id),
    qrSessionId: text(data.qrSessionId ?? data.qr_session_id),
    nurseryId: text(data.nurseryId ?? data.nursery_id),
    roomId: text(data.roomId ?? data.room_id),
    customerName: text(data.customerName ?? data.customer_name, "Guest"),
    customerPhoneMasked: text(data.customerPhoneMasked ?? data.customer_phone_masked, "010-****-0000"),
    status: text(data.status, "pending_payment"),
    deliveryMethod: text(data.deliveryMethod ?? data.delivery_method) === "delivery" ? "delivery" : "pickup",
    totalAmount: numberValue(data.totalAmount ?? data.total_amount, sumItems(items)),
    paidAt: iso(data.paidAt ?? data.paid_at),
    createdAt: iso(data.createdAt ?? data.created_at) ?? new Date(0).toISOString(),
    itemIds: asStringArray(data.itemIds ?? data.item_ids),
    companyId: text(data.company_id ?? data.companyId),
  };
}

async function listOrderItems(filters: Record<string, unknown>) {
  const companyId = text(filters.companyId);
  const deliveryStatus = text(filters.deliveryStatus);
  const from = text(filters.from);
  const to = text(filters.to);
  return (await readCollection("order_items", 2000))
    .map(mapOrderItem)
    .filter((item) => !companyId || item.companyId === companyId)
    .filter((item) => !deliveryStatus || item.deliveryStatus === deliveryStatus)
    .filter((item) => !from || item.createdAt >= from)
    .filter((item) => !to || item.createdAt <= to);
}

async function listOrderItemsByOrderNos(orderNos: string[]) {
  const targets = new Set(orderNos);
  if (!targets.size) return [];
  return (await readCollection("order_items", 2000)).map(mapOrderItem).filter((item) => targets.has(item.orderNo) || targets.has(item.orderId));
}

function mapOrderItem(doc: Doc) {
  const data = doc.data;
  const quantity = numberValue(data.quantity, 1);
  const unitPrice = numberValue(data.unitPrice ?? data.unit_price);
  const orderNo = text(data.order_no ?? data.orderNo ?? data.order_id ?? data.orderId);
  return {
    id: text(data.id ?? data.order_item_id, doc.id),
    orderId: orderNo,
    orderNo,
    companyId: text(data.companyId ?? data.company_id),
    productName: text(data.productName ?? data.product_name),
    optionName: text(data.optionName ?? data.option_name, "default"),
    quantity,
    unitPrice,
    deliveryStatus: text(data.deliveryStatus ?? data.delivery_status, "invoice_pending"),
    settlementAmount: numberValue(data.settlementAmount ?? data.settlement_amount, quantity * unitPrice),
    createdAt: iso(data.created_at ?? data.createdAt) ?? "",
  };
}

async function listPayments() {
  return (await readCollection("payments", 1000)).map((doc) => {
    const data = doc.data;
    return {
      id: doc.id,
      orderId: text(data.orderId ?? data.order_id ?? data.order_no),
      orderNo: text(data.orderNo ?? data.order_no),
      status: text(data.status, "pending"),
      amount: numberValue(data.amount ?? data.total_amount),
      mockTid: text(data.mockTid ?? data.mock_tid ?? data.provider_transaction_id),
      approvedAt: iso(data.approvedAt ?? data.approved_at ?? data.paid_at),
    };
  });
}

async function listInventoryMovements(filters: Record<string, unknown>) {
  const companyId = text(filters.companyId);
  const productId = text(filters.productId);
  const optionId = text(filters.optionId);
  return (await readCollection("inventory_movements", 2000))
    .map((doc) => {
      const data = doc.data;
      return {
        id: doc.id,
        productId: text(data.productId ?? data.product_id) || undefined,
        optionId: text(data.optionId ?? data.option_id),
        companyId: text(data.companyId ?? data.company_id) || undefined,
        type: text(data.type, "manual_adjust"),
        quantity: numberValue(data.quantity),
        reason: text(data.reason),
        sourceId: text(data.sourceId ?? data.source_id) || undefined,
        createdAt: iso(data.createdAt ?? data.created_at) ?? new Date(0).toISOString(),
        createdBy: text(data.createdBy ?? data.created_by) || undefined,
      };
    })
    .filter((item) => !companyId || item.companyId === companyId)
    .filter((item) => !productId || item.productId === productId)
    .filter((item) => !optionId || item.optionId === optionId);
}

async function listAuditLogs(filters: Record<string, unknown>) {
  const target = text(filters.target);
  const actorRole = text(filters.actorRole);
  return (await readCollection("audit_logs", 500))
    .map((doc) => {
      const data = doc.data;
      return {
        id: doc.id,
        actorRole: text(data.actorRole ?? data.actor_role, "admin"),
        actorName: text(data.actorName ?? data.actor_name, "A5"),
        action: text(data.action, "update"),
        target: text(data.target),
        message: text(data.message),
        createdAt: iso(data.createdAt ?? data.created_at) ?? new Date(0).toISOString(),
      };
    })
    .filter((item) => !target || item.target === target)
    .filter((item) => !actorRole || item.actorRole === actorRole);
}

function visibleCms(data: Record<string, unknown>) {
  const status = text(data.status ?? data.approval_status, "active").toLowerCase();
  const approval = text(data.approval_status ?? data.product_approval_status, status).toLowerCase();
  return ["active", "approved", "published", "live"].includes(status) || ["approved", "published", "live"].includes(approval);
}

async function getStorefrontContent() {
  const [homeSections, marketingBanners, marketingVideos, brands, brandPages, detailPages] = await Promise.all([
    readCollection("home_sections", 200),
    readCollection("marketing_banners", 200),
    readCollection("marketing_videos", 200),
    readCollection("brands", 200),
    readCollection("company_brand_pages", 500),
    readCollection("product_detail_pages", 1000),
  ]);
  const visibleHome = homeSections.filter((doc) => visibleCms(doc.data));
  const visibleBanners = marketingBanners.filter((doc) => visibleCms(doc.data));
  const visibleVideos = marketingVideos.filter((doc) => visibleCms(doc.data));
  const visibleBrands = [...brands, ...brandPages].filter((doc) => visibleCms(doc.data)).map(mapBrand);
  const productProfiles = detailPages.filter((doc) => visibleCms(doc.data)).map(mapProductProfile);
  const hero = visibleHome.find((doc) => text(doc.data.section_type ?? doc.data.placement).includes("hero")) ?? visibleBanners[0];
  const promos = visibleHome.filter((doc) => text(doc.data.section_type ?? doc.data.placement).includes("promo")).slice(0, 4);
  return {
    heroBanner: hero ? mapBanner(hero, "shopping_home_hero") : emptyBanner("firestore-empty-hero"),
    promoBanners: (promos.length ? promos : visibleBanners.slice(0, 4)).map((doc) => mapBanner(doc, "shopping_home_promo")),
    brands: visibleBrands,
    categories: [...new Set(productProfiles.map((profile) => profile.category).filter(Boolean))].map((category) => ({
      id: slug(category),
      label: category,
      helper: "",
    })),
    productProfiles,
    marketingSlots: [
      ...visibleBanners.map((doc) => mapMarketingSlot("banner", doc)),
      ...visibleVideos.map((doc) => mapMarketingSlot("video", doc)),
    ],
  };
}

async function getStorefrontRuntimeSnapshot() {
  const snapshot = await readLatestStorefrontRuntimeSnapshot(db());

  if (!snapshot) {
    const [products, content] = await Promise.all([listProducts({ status: "approved" }), getStorefrontContent()]);
    return {
      products,
      content,
      generatedAt: new Date().toISOString(),
      source: "live_firestore_fallback",
    };
  }

  const rawContent = asRecord(snapshot.content);
  const homeSections = snapshotDocs(rawContent.homeSections);
  const marketingBanners = snapshotDocs(rawContent.marketingBanners);
  const marketingVideos = snapshotDocs(rawContent.marketingVideos);
  const brands = snapshotDocs(rawContent.brands);
  const brandPages = snapshotDocs(rawContent.brandPages);
  const detailPages = snapshotDocs(rawContent.detailPages);
  const visibleHome = homeSections.filter((doc) => visibleCms(doc.data));
  const visibleBanners = marketingBanners.filter((doc) => visibleCms(doc.data));
  const visibleVideos = marketingVideos.filter((doc) => visibleCms(doc.data));
  const visibleBrands = [...brands, ...brandPages].filter((doc) => visibleCms(doc.data)).map(mapBrand);
  const productProfiles = detailPages.filter((doc) => visibleCms(doc.data)).map(mapProductProfile);
  const hero = visibleHome.find((doc) => text(doc.data.section_type ?? doc.data.placement).includes("hero")) ?? visibleBanners[0];
  const promos = visibleHome.filter((doc) => text(doc.data.section_type ?? doc.data.placement).includes("promo")).slice(0, 4);

  return {
    products: snapshotDocs(snapshot.products).filter((doc) => productVisible(doc.data)).map(mapProduct),
    content: {
      heroBanner: hero ? mapBanner(hero, "shopping_home_hero") : emptyBanner("firestore-empty-hero"),
      promoBanners: (promos.length ? promos : visibleBanners.slice(0, 4)).map((doc) => mapBanner(doc, "shopping_home_promo")),
      brands: visibleBrands,
      categories: [...new Set(productProfiles.map((profile) => profile.category).filter(Boolean))].map((category) => ({
        id: slug(category),
        label: category,
        helper: "",
      })),
      productProfiles,
      marketingSlots: [
        ...visibleBanners.map((doc) => mapMarketingSlot("banner", doc)),
        ...visibleVideos.map((doc) => mapMarketingSlot("video", doc)),
      ],
    },
    generatedAt: snapshot.generatedAt,
    source: "storefront_runtime_snapshots/latest",
  };
}

function snapshotDocs(value: unknown): Doc[] {
  return asRecordArray(value).map((item, index) => {
    const id = text(item.id, "snapshot-" + index);
    const data = { ...item };
    delete data.id;
    return { id, data };
  });
}

async function getProductProfileById(productId: string) {
  if (!productId) return undefined;
  const docs = await readCollection("product_detail_pages", 1000);
  const found = docs.find((doc) => text(doc.data.product_id ?? doc.data.productId, doc.id) === productId);
  return found ? mapProductProfile(found) : undefined;
}

async function listMarketingSlots(filters: Record<string, unknown>) {
  const type = text(filters.type);
  const [banners, videos] = await Promise.all([
    type && type !== "banner" ? Promise.resolve([]) : readCollection("marketing_banners", 200),
    type && type !== "video" ? Promise.resolve([]) : readCollection("marketing_videos", 200),
  ]);
  return [
    ...banners.filter((doc) => visibleCms(doc.data)).map((doc) => mapMarketingSlot("banner", doc)),
    ...videos.filter((doc) => visibleCms(doc.data)).map((doc) => mapMarketingSlot("video", doc)),
  ];
}

function emptyBanner(id: string) {
  return { id, title: "A5", subtitle: "", eyebrow: "Firestore", href: "/tablet/products/", imageUrl: "", tone: "gold" };
}

function mapBanner(doc: Doc, fallbackPlacement: string) {
  const data = doc.data;
  return {
    id: doc.id,
    title: text(data.title, doc.id),
    subtitle: text(data.subtitle ?? data.body ?? data.summary),
    eyebrow: text(data.eyebrow ?? data.placement, fallbackPlacement),
    href: text(data.href ?? data.click_target ?? data.link_url, "/tablet/products/"),
    imageUrl: firstMediaUrl(data),
    tone: bannerTone(data.tone),
  };
}

function mapBrand(doc: Doc) {
  const data = doc.data;
  const companyId = text(data.company_id ?? data.companyId);
  const businessNo = normalizeBusinessNo(
    data.business_registration_number_normalized ??
      data.businessRegistrationNumberNormalized ??
      data.business_registration_number ??
      data.businessRegistrationNumber ??
      companyId,
  );
  return {
    id: text(data.brand_id ?? data.brandId, doc.id),
    name: text(data.name ?? data.brand_name ?? data.title, doc.id),
    logoUrl: text(data.logo_url ?? data.logoUrl ?? data.asset_url),
    category: text(data.category ?? data.category_label),
    status: text(data.status) === "new" || text(data.status) === "review" ? text(data.status) : "featured",
    companyId,
    businessNo,
  };
}

function mapProductProfile(doc: Doc) {
  const data = doc.data;
  const productId = text(data.product_id ?? data.productId, doc.id);
  const gallery = galleryUrls(data);
  const brand = text(data.brand ?? data.brand_name ?? data.company_name);
  const category = text(data.category_label ?? data.category ?? data.subcategory);
  return {
    productId,
    brand,
    displayName: text(data.product_name ?? data.name ?? data.title, productId),
    subtitle: text(data.subtitle ?? data.summary),
    category,
    imageUrl: gallery[0] ?? "",
    gallery,
    badges: asStringArray(data.badges),
    tags: asStringArray(data.tags).length ? asStringArray(data.tags) : [brand, category].filter(Boolean),
    review: {
      rating: numberValue(asRecord(data.review).rating ?? data.review_rating),
      count: numberValue(asRecord(data.review).count ?? data.review_count),
      highlight: text(asRecord(data.review).highlight ?? data.review_highlight),
    },
    detailTabs: asRecordArray(data.detail_sections).map((section) => ({
      title: text(section.title, "Detail"),
      body: text(section.body ?? section.description),
    })),
  };
}

function mapMarketingSlot(type: "banner" | "video", doc: Doc) {
  const data = doc.data;
  return {
    id: doc.id,
    title: text(data.title, type === "video" ? "Video CMS item" : "Banner CMS item"),
    placement: text(data.placement, type === "video" ? "home_video_strip" : "shopping_home_top"),
    target: text(data.target ?? data.scope_id, "all_nurseries"),
    period: `${text(data.visible_from ?? data.starts_at, "start unset")} ~ ${text(data.visible_to ?? data.ends_at, "end unset")}`,
    status: text(data.status ?? data.approval_status, "approved"),
    owner: text(data.company_id ?? data.companyId ?? data.owner_type, "unknown"),
    performance: type === "video" ? "Firestore video" : "Firestore banner",
    assetUrl: firstMediaUrl(data),
    assetType: text(data.asset_type, type === "video" ? "video" : "image"),
    body: text(data.body ?? data.subtitle ?? data.summary),
    href: text(data.href ?? data.click_target ?? data.link_url ?? data.video_action_target ?? data.action_target, "/tablet/products/"),
    videoActionType: text(data.video_action_type ?? data.action_type, "none"),
    videoActionTarget: text(data.video_action_target ?? data.action_target),
    displayOrder: numberValue(data.display_order ?? data.order, 999),
  };
}

function firstMediaUrl(data: Record<string, unknown>) {
  const direct = safeMediaUrl(text(data.image_url ?? data.imageUrl ?? data.asset_url ?? data.assetUrl ?? data.thumbnail_url ?? data.video_url));
  if (direct) return direct;
  for (const item of asRecordArray(data.media)) {
    const url = safeMediaUrl(text(item.url ?? item.asset_url ?? item.downloadUrl));
    if (url) return url;
  }
  return "";
}

function galleryUrls(data: Record<string, unknown>) {
  const urls = new Set(asStringArray(data.gallery).map(safeMediaUrl).filter(Boolean));
  for (const item of asRecordArray(data.media)) {
    const url = safeMediaUrl(text(item.url ?? item.asset_url ?? item.downloadUrl));
    if (url) urls.add(url);
  }
  const first = firstMediaUrl(data);
  if (first) urls.add(first);
  return [...urls];
}

function bannerTone(value: unknown) {
  const tone = text(value);
  return tone === "dark" || tone === "rose" || tone === "sage" ? tone : "gold";
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "category";
}

function safeMediaUrl(value: string) {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("/") || raw.startsWith("#")) return raw;

  try {
    const url = new URL(raw);
    return url.hostname.toLowerCase() === "mommy-a5.pages.dev" ? "" : raw;
  } catch {
    return "";
  }
}
