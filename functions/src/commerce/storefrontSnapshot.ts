import { FieldValue, type Firestore } from "firebase-admin/firestore";

type Doc = {
  id: string;
  data: Record<string, unknown>;
};

export type StorefrontSnapshotSourceDoc = Doc;

export type StorefrontRuntimeSnapshot = {
  id: string;
  version: number;
  generatedAt: string;
  sourceCollections: string[];
  products: unknown[];
  content: unknown;
};

const snapshotCollection = "storefront_runtime_snapshots";
const latestSnapshotId = "latest";

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function visibleCms(data: Record<string, unknown>) {
  const status = text(data.status ?? data.approval_status, "active").toLowerCase();
  const approval = text(data.approval_status ?? data.approvalStatus, status).toLowerCase();
  return ["active", "approved", "published", "live"].includes(status) || ["approved", "published", "live"].includes(approval);
}

function visibleProduct(data: Record<string, unknown>) {
  const status = text(data.status, "active").toLowerCase();
  const approval = text(data.approval_status ?? data.approvalStatus, "").toLowerCase();
  const productApproval = text(data.product_approval_status ?? data.productApprovalStatus ?? approval, approval).toLowerCase();
  const companyApproval = text(data.company_approval_status ?? data.companyApprovalStatus ?? approval, approval).toLowerCase();

  return (
    ["active", "approved"].includes(status) &&
    ["approved", "published", "live", ""].includes(productApproval) &&
    ["approved", "published", "live", ""].includes(companyApproval)
  );
}

async function readCollection(db: Firestore, collectionName: string, limit = 500): Promise<Doc[]> {
  const snapshot = await db.collection(collectionName).limit(limit).get();
  return snapshot.docs.map((document) => ({ id: document.id, data: document.data() as Record<string, unknown> }));
}

function mapRawDoc(doc: Doc) {
  return {
    id: doc.id,
    ...doc.data,
  };
}

function firstDefined(data: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = data[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asRecords(value: unknown) {
  return Array.isArray(value) ? value.map(asRecord).filter((item) => Object.keys(item).length) : [];
}

function stringList(value: unknown) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
  return [...new Set(values.map((item) => text(item)).filter(Boolean))];
}

function put(target: Record<string, unknown>, key: string, value: unknown) {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value) && value.length === 0) return;
  if (typeof value === "object" && !Array.isArray(value) && Object.keys(asRecord(value)).length === 0) return;
  target[key] = value;
}

function compactDetailSections(value: unknown) {
  return asRecords(value)
    .map((section) => {
      const compact: Record<string, unknown> = {};
      put(compact, "id", firstDefined(section, ["id"]));
      put(compact, "type", firstDefined(section, ["type"]));
      put(compact, "title", firstDefined(section, ["title"]));
      put(compact, "body", firstDefined(section, ["body", "description"]));
      put(compact, "asset_url", firstDefined(section, ["asset_url", "assetUrl", "url"]));
      put(compact, "asset_path", firstDefined(section, ["asset_path", "assetPath"]));
      put(compact, "asset_file_name", firstDefined(section, ["asset_file_name", "assetFileName"]));
      put(compact, "sort_order", firstDefined(section, ["sort_order", "sortOrder"]));
      return compact;
    })
    .filter((section) => Object.keys(section).length > 0);
}

function publicMediaUrls(data: Record<string, unknown>) {
  const urls = new Set<string>();
  for (const key of ["image_url", "imageUrl", "asset_url", "assetUrl", "thumbnail_url", "video_url"]) {
    const value = text(data[key]);
    if (value) urls.add(value);
  }
  for (const key of ["gallery", "detail_images", "detailImages"]) {
    for (const value of stringList(data[key])) urls.add(value);
  }
  for (const media of asRecords(data.media)) {
    const value = text(firstDefined(media, ["url", "asset_url", "downloadUrl"]));
    if (value) urls.add(value);
  }
  for (const section of compactDetailSections(firstDefined(data, ["detail_sections", "detailSections"]))) {
    const value = text(section.asset_url);
    if (value) urls.add(value);
  }
  return [...urls];
}

export function compactStorefrontProductDoc(doc: StorefrontSnapshotSourceDoc) {
  const data = doc.data;
  const compact: Record<string, unknown> = { id: doc.id };
  const fields: Array<[string, string[]]> = [
    ["product_id", ["product_id", "productId"]],
    ["company_id", ["company_id", "companyId"]],
    ["seller_company_id", ["seller_company_id", "sellerCompanyId", "pg_owner_company_id"]],
    ["seller_business_no", ["seller_business_no", "sellerBusinessNo", "business_no", "businessNo"]],
    ["seller_company_name", ["seller_company_name", "sellerCompanyName", "company_name", "companyName"]],
    ["nursery_id", ["nursery_id", "nurseryId"]],
    ["title", ["title", "name"]],
    ["brand", ["brand"]],
    ["subtitle", ["subtitle", "summary"]],
    ["category", ["category", "category_label"]],
    ["status", ["status"]],
    ["approval_status", ["approval_status", "approvalStatus"]],
    ["product_approval_status", ["product_approval_status", "productApprovalStatus"]],
    ["company_approval_status", ["company_approval_status", "companyApprovalStatus"]],
    ["moderation_status", ["moderation_status", "moderationStatus"]],
    ["list_price", ["list_price", "listPrice"]],
    ["open_mall_price", ["open_mall_price", "openMallPrice", "platform_lowest_price", "platformLowestPrice"]],
    ["platform_lowest_price", ["platform_lowest_price", "platformLowestPrice", "open_mall_price", "openMallPrice"]],
    ["closed_mall_price", ["closed_mall_price", "closedMallPrice", "price"]],
    ["price", ["price", "closed_mall_price", "closedMallPrice"]],
    ["price_comparison_verified", ["price_comparison_verified", "priceComparisonVerified"]],
    ["price_comparison_status", ["price_comparison_status", "priceComparisonStatus"]],
    ["comparison_verification_source", [
      "comparison_verification_source",
      "comparisonVerificationSource",
      "comparison_price_verification_source",
      "comparisonPriceVerificationSource",
      "price_comparison_verification_source",
    ]],
    ["comparison_verified_at", [
      "comparison_verified_at",
      "comparisonVerifiedAt",
      "price_comparison_verified_at",
    ]],
    ["inventory", ["inventory", "stock"]],
    ["inventory_status", ["inventory_status", "inventoryStatus"]],
    ["purchasable", ["purchasable"]],
    ["external_product_code", ["external_product_code", "externalProductCode"]],
    ["public_path", ["public_path", "publicPath"]],
    ["tablet_path", ["tablet_path", "tabletPath", "tablet_product_path"]],
    ["mobile_path", ["mobile_path", "mobilePath", "mobile_product_path"]],
    ["canonical_url", ["canonical_url", "canonicalUrl"]],
    ["product_url", ["product_url", "productUrl"]],
    ["ad_target_path", ["ad_target_path", "adTargetPath"]],
    ["mobile_ad_target_path", ["mobile_ad_target_path", "mobileAdTargetPath"]],
    ["business_brand_path", ["business_brand_path", "businessBrandPath", "a5mall_brand_path"]],
    ["business_product_path", ["business_product_path", "businessProductPath", "a5mall_product_path"]],
    ["business_brand_url", ["business_brand_url", "businessBrandUrl"]],
    ["business_product_url", ["business_product_url", "businessProductUrl"]],
    ["url_version", ["url_version", "urlVersion"]],
    ["image_url", ["image_url", "imageUrl"]],
    ["delivery_available", ["delivery_available", "deliveryAvailable"]],
    ["pickup_available", ["pickup_available", "pickupAvailable"]],
    ["source", ["source"]],
    ["source_import_id", ["source_import_id", "sourceImportId"]],
  ];
  for (const [target, aliases] of fields) put(compact, target, firstDefined(data, aliases));
  put(compact, "option_ids", firstDefined(data, ["option_ids", "optionIds"]));
  put(compact, "gallery", stringList(data.gallery));
  put(compact, "tags", stringList(data.tags));
  put(compact, "badges", stringList(data.badges));
  put(compact, "shipping_fee_policy", firstDefined(data, ["shipping_fee_policy", "shippingFeePolicy"]));
  put(compact, "detail_sections", compactDetailSections(firstDefined(data, ["detail_sections", "detailSections"])));
  return compact;
}

export function compactStorefrontProductDetailDoc(doc: StorefrontSnapshotSourceDoc) {
  const data = doc.data;
  const compact: Record<string, unknown> = { id: doc.id };
  const fields: Array<[string, string[]]> = [
    ["product_id", ["product_id", "productId"]],
    ["product_name", ["product_name", "name", "title"]],
    ["brand", ["brand", "brand_name", "company_name"]],
    ["subtitle", ["subtitle", "summary"]],
    ["category_label", ["category_label", "category", "subcategory"]],
    ["status", ["status"]],
    ["approval_status", ["approval_status", "approvalStatus"]],
    ["source", ["source"]],
    ["source_import_id", ["source_import_id", "sourceImportId"]],
  ];
  for (const [target, aliases] of fields) put(compact, target, firstDefined(data, aliases));
  put(compact, "gallery", publicMediaUrls(data));
  put(compact, "badges", stringList(data.badges));
  put(compact, "tags", stringList(data.tags));
  put(compact, "review", data.review);
  put(compact, "detail_sections", compactDetailSections(firstDefined(data, ["detail_sections", "detailSections"])));
  return compact;
}

export async function buildStorefrontRuntimeSnapshot(db: Firestore): Promise<StorefrontRuntimeSnapshot> {
  const [products, homeSections, marketingBanners, marketingVideos, brands, brandPages, detailPages] = await Promise.all([
    readCollection(db, "products", 1000),
    readCollection(db, "home_sections", 200),
    readCollection(db, "marketing_banners", 200),
    readCollection(db, "marketing_videos", 200),
    readCollection(db, "brands", 200),
    readCollection(db, "company_brand_pages", 500),
    readCollection(db, "product_detail_pages", 1000),
  ]);
  const generatedAt = new Date().toISOString();

  return {
    id: latestSnapshotId,
    version: Date.now(),
    generatedAt,
    sourceCollections: [
      "products",
      "home_sections",
      "marketing_banners",
      "marketing_videos",
      "brands",
      "company_brand_pages",
      "product_detail_pages",
    ],
    products: products.filter((doc) => visibleProduct(doc.data)).map(compactStorefrontProductDoc),
    content: {
      homeSections: homeSections.filter((doc) => visibleCms(doc.data)).map(mapRawDoc),
      marketingBanners: marketingBanners.filter((doc) => visibleCms(doc.data)).map(mapRawDoc),
      marketingVideos: marketingVideos.filter((doc) => visibleCms(doc.data)).map(mapRawDoc),
      brands: brands.filter((doc) => visibleCms(doc.data)).map(mapRawDoc),
      brandPages: brandPages.filter((doc) => visibleCms(doc.data)).map(mapRawDoc),
      detailPages: detailPages.filter((doc) => visibleCms(doc.data)).map(compactStorefrontProductDetailDoc),
    },
  };
}

export async function publishStorefrontRuntimeSnapshot(db: Firestore, reason: string) {
  const snapshot = await buildStorefrontRuntimeSnapshot(db);

  await db.collection(snapshotCollection).doc(latestSnapshotId).set(
    {
      ...snapshot,
      reason,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await db.collection("audit_logs").doc(`storefront-runtime-snapshot-${snapshot.version}`).set({
    type: "storefront_runtime_snapshot",
    action: "publish",
    reason,
    snapshot_id: latestSnapshotId,
    version: snapshot.version,
    product_count: snapshot.products.length,
    source_collections: snapshot.sourceCollections,
    created_at: FieldValue.serverTimestamp(),
  });

  return snapshot;
}

export async function readLatestStorefrontRuntimeSnapshot(db: Firestore): Promise<StorefrontRuntimeSnapshot | undefined> {
  const snapshot = await db.collection(snapshotCollection).doc(latestSnapshotId).get();

  if (!snapshot.exists) return undefined;

  const data = snapshot.data() as StorefrontRuntimeSnapshot | undefined;
  if (!data) return undefined;

  return {
    ...data,
    id: snapshot.id,
  };
}
