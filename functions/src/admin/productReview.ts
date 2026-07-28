import { FieldValue, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { publishStorefrontRuntimeSnapshot } from "../commerce/storefrontSnapshot";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type ProductReviewStatus = "approved" | "rejected" | "draft";

type ProductReviewRequest = {
  draftId?: string;
  productId?: string;
  status?: ProductReviewStatus;
  reviewMemo?: string;
};

type AdminActor = {
  uid: string;
  email: string;
  role: string;
};

type ProductVariantRecord = {
  id?: unknown;
  optionName?: unknown;
  option_name?: unknown;
  optionPath?: unknown;
  option_path?: unknown;
  normalPrice?: unknown;
  normal_price?: unknown;
  platformLowestPrice?: unknown;
  platform_lowest_price?: unknown;
  baseClosedMallPrice?: unknown;
  base_closed_mall_price?: unknown;
  closedMallPrice?: unknown;
  closed_mall_price?: unknown;
  finalSalePrice?: unknown;
  final_sale_price?: unknown;
  additionalPrice?: unknown;
  price_delta?: unknown;
  stock?: unknown;
  inventory?: unknown;
  status?: unknown;
  externalProductCode?: unknown;
  external_product_code?: unknown;
  externalOptionCode?: unknown;
  external_option_code?: unknown;
  sku?: unknown;
  barcode?: unknown;
};

type ProductEditRequestRecord = {
  company_id?: unknown;
  companyId?: unknown;
  product_id?: unknown;
  productId?: unknown;
  title?: unknown;
  requested?: unknown;
  original?: unknown;
  changed_fields?: unknown;
};

const masterAdminEmail = "rosabaya08@gmail.com";
const productSourceChannel = "company_product_registration";
const defaultPublicOrigin = "https://signage-ai-a5.co.kr";

function normalizeBusinessNoValue(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function productUrlFields(productId: string, businessNoValue?: unknown) {
  const encodedProductId = encodeURIComponent(productId.trim());
  const tabletPath = `/tablet/products/${encodedProductId}/`;
  const mobilePath = `/m/shop/product/${encodedProductId}/`;
  const publicOrigin = (process.env.A5_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_A5_PUBLIC_ORIGIN || defaultPublicOrigin).trim().replace(/\/+$/, "");
  const businessNo = normalizeBusinessNoValue(businessNoValue);
  const businessBrandPath = businessNo ? `/a5mall/${encodeURIComponent(businessNo)}/` : "";
  const businessProductPath = businessNo ? `${businessBrandPath}${encodedProductId}/` : "";

  return {
    public_path: tabletPath,
    tablet_path: tabletPath,
    mobile_path: mobilePath,
    canonical_url: `${publicOrigin || defaultPublicOrigin}${tabletPath}`,
    product_url: `${publicOrigin || defaultPublicOrigin}${tabletPath}`,
    ad_target_path: tabletPath,
    mobile_ad_target_path: mobilePath,
    ...(businessNo
      ? {
          business_brand_path: businessBrandPath,
          businessBrandPath,
          business_product_path: businessProductPath,
          businessProductPath,
          business_brand_url: `${publicOrigin || defaultPublicOrigin}${businessBrandPath}`,
          businessBrandUrl: `${publicOrigin || defaultPublicOrigin}${businessBrandPath}`,
          business_product_url: `${publicOrigin || defaultPublicOrigin}${businessProductPath}`,
          businessProductUrl: `${publicOrigin || defaultPublicOrigin}${businessProductPath}`,
          a5mall_brand_path: businessBrandPath,
          a5mall_product_path: businessProductPath,
        }
      : {}),
    url_version: businessNo ? 2 : 1,
  };
}

function productBusinessNoFromRecord(recordValue: Record<string, unknown>) {
  return (
    normalizeBusinessNoValue(recordValue.seller_business_no_normalized) ||
    normalizeBusinessNoValue(recordValue.sellerBusinessNoNormalized) ||
    normalizeBusinessNoValue(recordValue.seller_business_no) ||
    normalizeBusinessNoValue(recordValue.sellerBusinessNo) ||
    normalizeBusinessNoValue(recordValue.company_business_no_normalized) ||
    normalizeBusinessNoValue(recordValue.companyBusinessNoNormalized) ||
    normalizeBusinessNoValue(recordValue.company_business_no) ||
    normalizeBusinessNoValue(recordValue.companyBusinessNo) ||
    normalizeBusinessNoValue(recordValue.business_registration_number_normalized) ||
    normalizeBusinessNoValue(recordValue.business_registration_number)
  );
}

export async function adminProductReviewHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  if (process.env.A5_LEGACY_PRODUCT_APPROVAL_ENABLED !== "1") {
    sendJson(response, 410, {
      ok: false,
      error: {
        code: "LEGACY_PRODUCT_APPROVAL_DISABLED",
        message: "Legacy product approval is disabled. Company products are published through companyProductUpsert.",
        httpStatus: 410,
      },
    });
    return;
  }

  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<ProductReviewRequest>(request);
  const draftId = text(body.draftId ?? body.productId);
  const status = body.status;
  const reviewMemo = text(body.reviewMemo);

  if (!draftId || !isProductReviewStatus(status)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_PRODUCT_REVIEW_REQUEST_INVALID",
        message: "draftId/productId and status are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const reviewedAt = new Date().toISOString();
  const draftRef = db.collection("product_detail_pages").doc(draftId);
  const editRequestRef = db.collection("company_product_edit_requests").doc(draftId);

  try {
    const result = await db.runTransaction(async (transaction) => {
      const draftSnapshot = await transaction.get(draftRef);

      if (!draftSnapshot.exists) {
        const editRequestSnapshot = await transaction.get(editRequestRef);

        if (!editRequestSnapshot.exists) {
          throw new ProductReviewError(404, "PRODUCT_REVIEW_TARGET_NOT_FOUND", "Product draft or edit request was not found.");
        }

        return reviewProductEditRequest({
          db,
          transaction,
          editRequestRef,
          editRequest: { id: editRequestSnapshot.id, ...editRequestSnapshot.data() } as ProductEditRequestRecord & { id: string },
          status,
          reviewMemo,
          reviewedAt,
          actor,
        });
      }

      const draft = { id: draftSnapshot.id, ...draftSnapshot.data() } as Record<string, unknown>;
      const companyId = text(draft.company_id ?? draft.companyId);
      const productId = text(draft.product_id) || draftSnapshot.id;

      if (!companyId) {
        throw new ProductReviewError(409, "PRODUCT_DRAFT_COMPANY_ID_MISSING", "Product draft is missing company_id.");
      }

      transaction.set(
        draftRef,
        {
          status,
          approval_status: status,
          source_app: "admin",
          reviewed_at: reviewedAt,
          review_memo: reviewMemo,
          reviewed_by_uid: actor.uid,
          reviewed_by_email: actor.email,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      const writtenCollections = ["product_detail_pages"];
      let optionCount = 0;

      if (status === "approved") {
        const productRef = db.collection("products").doc(productId);
        const productRecord = buildProductRecord(draft, productId, companyId, reviewedAt, reviewMemo);
        const optionRecords = buildProductOptionRecords(draft, productId, companyId, reviewedAt);

        transaction.set(productRef, productRecord, { merge: true });
        writtenCollections.push("products");

        for (const optionRecord of optionRecords) {
          transaction.set(db.collection("product_options").doc(optionRecord.id), optionRecord, { merge: true });
          optionCount += 1;
        }

        if (optionCount > 0) writtenCollections.push("product_options");
      }

      transaction.set(db.collection("audit_logs").doc(`admin-product-review-${productId}-${Date.now()}`), {
        type: "admin_product_review",
        action: status,
        product_id: productId,
        draft_id: draftSnapshot.id,
        company_id: companyId,
        actor_uid: actor.uid,
        actor_email: actor.email,
        actor_role: actor.role,
        review_memo: reviewMemo,
        written_collections: writtenCollections,
        created_at: FieldValue.serverTimestamp(),
      });

      return {
        productId,
        draftId: draftSnapshot.id,
        companyId,
        status,
        optionCount,
        writtenCollections,
      };
    });

    const snapshotPublish =
      result.status === "approved"
        ? await publishSnapshotAfterProductReview(db, result.productId, result.draftId)
        : { ok: false, skipped: true, reason: "Product review was not approved." };

    sendJson(response, 200, {
      ok: true,
      ...result,
      snapshotPublish,
      source: "firebase_functions",
      reviewedAt,
    });
  } catch (error) {
    if (error instanceof ProductReviewError) {
      sendJson(response, error.httpStatus, {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          httpStatus: error.httpStatus,
        },
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Product review failed.";
    sendJson(response, 500, {
      ok: false,
      error: {
        code: "ADMIN_PRODUCT_REVIEW_FAILED",
        message,
        httpStatus: 500,
      },
    });
  }
}

async function publishSnapshotAfterProductReview(db: Firestore, productId: string, draftId: string) {
  try {
    const snapshot = await publishStorefrontRuntimeSnapshot(db, `admin_product_review:${productId}:${draftId}`);

    return {
      ok: true,
      snapshotId: snapshot.id,
      version: snapshot.version,
      generatedAt: snapshot.generatedAt,
      productCount: snapshot.products.length,
    };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Storefront runtime snapshot publish failed.",
    };
  }
}

async function reviewProductEditRequest(input: {
  db: Firestore;
  transaction: Transaction;
  editRequestRef: DocumentReference;
  editRequest: ProductEditRequestRecord & { id: string };
  status: ProductReviewStatus;
  reviewMemo: string;
  reviewedAt: string;
  actor: AdminActor;
}) {
  const companyId = text(input.editRequest.company_id ?? input.editRequest.companyId);
  const productId = text(input.editRequest.product_id ?? input.editRequest.productId);

  if (!companyId || !productId) {
    throw new ProductReviewError(409, "PRODUCT_EDIT_REQUEST_SCOPE_MISSING", "Product edit request is missing company_id or product_id.");
  }

  const productRef = input.db.collection("products").doc(productId);
  const productSnapshot = await input.transaction.get(productRef);

  if (!productSnapshot.exists) {
    throw new ProductReviewError(404, "PRODUCT_EDIT_TARGET_NOT_FOUND", "Live product for edit request was not found.");
  }

  const product = productSnapshot.data() ?? {};
  const productCompanyId = text(product.company_id ?? product.companyId);

  if (productCompanyId && productCompanyId !== companyId) {
    throw new ProductReviewError(409, "PRODUCT_EDIT_COMPANY_MISMATCH", "Product edit request company does not match the live product owner.");
  }

  const optionSnapshot = await input.transaction.get(
    input.db.collection("product_options").where("product_id", "==", productId),
  );
  const requested = record(input.editRequest.requested);
  const requestedProductRecord = record(requested.product_record ?? requested.productRecord);
  const requestedDetailRecord = record(requested.detail_record ?? requested.detailRecord);
  const requestedOptionRecords = recordArray(requested.option_records ?? requested.optionRecords);
  const requestedSuspendedOptionRecords = recordArray(requested.suspended_option_records ?? requested.suspendedOptionRecords);
  const hasStructuredEditPayload =
    Object.keys(requestedProductRecord).length > 0 ||
    Object.keys(requestedDetailRecord).length > 0 ||
    requestedOptionRecords.length > 0 ||
    requestedSuspendedOptionRecords.length > 0;
  const requestedStock = maybeNumber(requested.stock, requested.inventory);
  const requestedStatus = text(requested.status);
  const nextLiveStatus = liveProductStatusFor(requestedStatus, text(product.status) || "active");
  const writtenCollections = ["company_product_edit_requests"];
  let optionCount = 0;
  let optionStockSkipped = false;

  input.transaction.set(
    input.editRequestRef,
    {
      status: input.status,
      approval_status: input.status,
      reviewed_at: input.reviewedAt,
      review_memo: input.reviewMemo,
      reviewed_by_uid: input.actor.uid,
      reviewed_by_email: input.actor.email,
      applied_at: input.status === "approved" ? input.reviewedAt : null,
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (input.status === "approved") {
    if (hasStructuredEditPayload) {
      input.transaction.set(
        productRef,
        buildApprovedProductEditRecord(requestedProductRecord, productId, companyId, nextLiveStatus, input.reviewedAt, input.reviewMemo),
        { merge: true },
      );
      pushUnique(writtenCollections, "products");

      if (Object.keys(requestedDetailRecord).length > 0) {
        const detailRecord = buildApprovedDetailEditRecord(requestedDetailRecord, productId, companyId, input.reviewedAt, input.reviewMemo);
        input.transaction.set(input.db.collection("product_detail_pages").doc(detailRecord.id), detailRecord, { merge: true });
        pushUnique(writtenCollections, "product_detail_pages");
      }

      const optionRecordsToApply = [...requestedOptionRecords, ...requestedSuspendedOptionRecords];
      optionRecordsToApply.forEach((optionRecord, index) => {
        const approvedOptionRecord = buildApprovedOptionEditRecord(optionRecord, productId, companyId, input.reviewedAt, index);
        input.transaction.set(input.db.collection("product_options").doc(approvedOptionRecord.id), approvedOptionRecord, { merge: true });
        optionCount += 1;
      });

      if (optionCount > 0) pushUnique(writtenCollections, "product_options");
    } else {
      input.transaction.set(productRef, buildProductEditPatch(product, requested, productId, nextLiveStatus, input.reviewedAt, input.reviewMemo), {
        merge: true,
      });
      pushUnique(writtenCollections, "products");

      if (requestedStock !== undefined) {
        if (optionSnapshot.size === 1) {
          const optionDoc = optionSnapshot.docs[0];
          input.transaction.set(
            optionDoc.ref,
            {
              stock: requestedStock,
              inventory: requestedStock,
              updated_at: FieldValue.serverTimestamp(),
              source_app: "admin",
              source_channel: "company_product_edit_approval",
            },
            { merge: true },
          );
          pushUnique(writtenCollections, "product_options");
          optionCount = 1;
        } else if (optionSnapshot.empty) {
          const optionId = productOptionId(productId, "default");
          input.transaction.set(
            input.db.collection("product_options").doc(optionId),
            {
              id: optionId,
              option_id: optionId,
              product_id: productId,
              company_id: companyId,
              companyId,
              name: "default",
              option_name: "default",
              price_delta: 0,
              stock: requestedStock,
              inventory: requestedStock,
              status: "active",
              approval_status: "approved",
              product_approval_status: "approved",
              company_approval_status: "approved",
              source_app: "admin",
              source_channel: "company_product_edit_approval",
              source: "company_product_editor",
              demo_read_enabled: true,
              guest_write_enabled: true,
              updated_at: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
          pushUnique(writtenCollections, "product_options");
          optionCount = 1;
        } else {
          optionStockSkipped = true;
        }
      }
    }
  }

  input.transaction.set(input.db.collection("audit_logs").doc(`admin-product-edit-review-${productId}-${Date.now()}`), {
    type: "admin_product_edit_review",
    action: input.status,
    product_id: productId,
    edit_request_id: input.editRequest.id,
    company_id: companyId,
    actor_uid: input.actor.uid,
    actor_email: input.actor.email,
    actor_role: input.actor.role,
    review_memo: input.reviewMemo,
    option_stock_skipped: optionStockSkipped,
    written_collections: writtenCollections,
    created_at: FieldValue.serverTimestamp(),
  });

  return {
    productId,
    draftId: input.editRequest.id,
    companyId,
    status: input.status,
    optionCount,
    writtenCollections,
    editRequest: true,
    optionStockSkipped,
  };
}

function buildProductEditPatch(
  currentProduct: Record<string, unknown>,
  requested: Record<string, unknown>,
  productId: string,
  liveStatus: string,
  reviewedAt: string,
  reviewMemo: string,
) {
  const currentComparison = record(currentProduct.comparison);
  const requestedPrice = maybeNumber(requested.price, requested.closed_mall_price, requested.closedMallPrice);
  const nextClosedMallPrice = requestedPrice ?? firstNumber(currentProduct.closed_mall_price, currentProduct.closedMallPrice, currentProduct.price);
  const listPrice = maybeNumber(currentProduct.list_price, currentProduct.listPrice, currentComparison.listPrice) ?? 0;
  const platformLowestPrice = maybeNumber(currentProduct.platform_lowest_price, currentProduct.platformLowestPrice, currentComparison.platformLowestPrice) ?? 0;
  const priceInput = { listPrice, platformLowestPrice, closedMallPrice: nextClosedMallPrice };
  const metrics = calculateProductPriceMetrics(priceInput);
  const comparisonVerified = isProductPriceComparisonVerified(priceInput);
  const comparisonStatus = productPriceComparisonStatus(priceInput);
  const requestedStock = maybeNumber(requested.stock, requested.inventory);
  const patch: Record<string, unknown> = {
    status: liveStatus,
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    source_app: "admin",
    source_channel: "company_product_edit_approval",
    source: "company_product_editor",
    ...productUrlFields(productId, productBusinessNoFromRecord(requested) || productBusinessNoFromRecord(currentProduct)),
    edited_at: reviewedAt,
    reviewed_at: reviewedAt,
    review_memo: reviewMemo,
    updated_at: FieldValue.serverTimestamp(),
  };

  const name = text(requested.name ?? requested.title);
  if (name) {
    patch.title = name;
    patch.name = name;
  }

  const category = text(requested.category);
  if (category) patch.category = category;

  const summary = text(requested.summary ?? requested.subtitle);
  if (summary) patch.subtitle = summary;

  const externalProductCode = text(requested.external_product_code ?? requested.externalProductCode);
  if (externalProductCode) patch.external_product_code = externalProductCode;

  if (requestedPrice !== undefined) {
    patch.price = nextClosedMallPrice;
    patch.closed_mall_price = nextClosedMallPrice;
    patch.platform_lowest_price = platformLowestPrice;
    patch.list_price = listPrice;
    patch.normal_discount_amount = metrics.normalDiscountAmount;
    patch.platform_discount_amount = metrics.platformDiscountAmount;
    patch.normal_discount_rate = metrics.normalDiscountRate;
    patch.platform_discount_rate = metrics.platformDiscountRate;
    patch.price_comparison_verified = comparisonVerified;
    patch.priceComparisonVerified = comparisonVerified;
    patch.price_comparison_status = comparisonStatus;
    patch.priceComparisonStatus = comparisonStatus;
    patch.comparison = {
      ...currentComparison,
      listPrice,
      platformLowestPrice,
      closedMallPrice: nextClosedMallPrice,
      verified: comparisonVerified,
      status: comparisonStatus,
      normalDiscountAmount: metrics.normalDiscountAmount,
      platformDiscountAmount: metrics.platformDiscountAmount,
      normalDiscountRate: metrics.normalDiscountRate,
      platformDiscountRate: metrics.platformDiscountRate,
    };
  }

  if (requestedStock !== undefined) {
    patch.stock = requestedStock;
    patch.inventory = requestedStock;
  }

  return patch;
}

function buildProductRecord(
  draft: Record<string, unknown>,
  productId: string,
  companyId: string,
  reviewedAt: string,
  reviewMemo: string,
) {
  const pricing = record(draft.pricing);
  const variants = variantRecords(draft.variants ?? draft.skus);
  const activeVariants = variants.filter((variant) => !isSuspendedVariant(variant));
  const firstVariant = activeVariants[0] ?? variants[0] ?? {};
  const representativeMedia = mediaRecords(draft.media).find((item) => text(item.role) === "representative");
  const gallery = mediaRecords(draft.media)
    .map((item) => text(item.url))
    .filter(Boolean);

  const listPrice = firstNumber(
    firstVariant.normalPrice,
    firstVariant.normal_price,
    pricing.listPrice,
    pricing.list_price,
  );
  const platformLowestPrice = firstNumber(
    firstVariant.platformLowestPrice,
    firstVariant.platform_lowest_price,
    pricing.platformLowestPrice,
    pricing.platform_lowest_price,
  );
  const closedMallPrice = firstNumber(
    firstVariant.baseClosedMallPrice,
    firstVariant.base_closed_mall_price,
    firstVariant.closedMallPrice,
    firstVariant.closed_mall_price,
    firstVariant.finalSalePrice,
    firstVariant.final_sale_price,
    pricing.closedMallPrice,
    pricing.closed_mall_price,
  );
  const priceInput = { listPrice, platformLowestPrice, closedMallPrice };
  const metrics = calculateProductPriceMetrics(priceInput);
  const comparisonVerified = isProductPriceComparisonVerified(priceInput);
  const comparisonStatus = productPriceComparisonStatus(priceInput);
  const optionIds = variants.map((variant, index) => productOptionId(productId, text(variant.id) || `variant-${index + 1}`));
  const stock = activeVariants.reduce((total, variant) => total + firstNumber(variant.stock, variant.inventory), 0);
  const fulfillment = text(draft.fulfillment);

  return {
    id: productId,
    product_id: productId,
    title: text(draft.title ?? draft.name),
    name: text(draft.title ?? draft.name),
    brand: text(draft.brand),
    subtitle: text(draft.summary),
    category: text(draft.category_label ?? draft.category ?? draft.subcategory),
    category_id: text(draft.category_id),
    category_code: text(draft.category_code),
    subcategory: text(draft.subcategory),
    company_id: companyId,
    companyId,
    status: "active",
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    price: closedMallPrice,
    closed_mall_price: closedMallPrice,
    platform_lowest_price: platformLowestPrice,
    list_price: listPrice,
    price_comparison_verified: comparisonVerified,
    priceComparisonVerified: comparisonVerified,
    price_comparison_status: comparisonStatus,
    priceComparisonStatus: comparisonStatus,
    normal_discount_amount: metrics.normalDiscountAmount,
    platform_discount_amount: metrics.platformDiscountAmount,
    normal_discount_rate: metrics.normalDiscountRate,
    platform_discount_rate: metrics.platformDiscountRate,
    comparison: {
      listPrice,
      platformLowestPrice,
      closedMallPrice,
      verified: comparisonVerified,
      status: comparisonStatus,
      normalDiscountAmount: metrics.normalDiscountAmount,
      platformDiscountAmount: metrics.platformDiscountAmount,
      normalDiscountRate: metrics.normalDiscountRate,
      platformDiscountRate: metrics.platformDiscountRate,
    },
    inventory: stock,
    stock,
    option_ids: optionIds,
    ...productUrlFields(productId, productBusinessNoFromRecord(draft)),
    external_product_code: text(firstVariant.externalProductCode ?? firstVariant.external_product_code) || productId,
    image_url: text(representativeMedia?.url),
    gallery: gallery.length ? gallery : text(representativeMedia?.url) ? [text(representativeMedia?.url)] : [],
    delivery_available: fulfillment === "delivery" || fulfillment === "both",
    pickup_available: fulfillment === "pickup" || fulfillment === "both",
    detail_sections: detailSections(draft.detail_sections),
    source_app: "company",
    source_channel: productSourceChannel,
    source: "company_product_editor",
    demo_read_enabled: true,
    guest_write_enabled: true,
    approved_by_role: "SUPER_ADMIN",
    approved_at: reviewedAt,
    reviewed_at: reviewedAt,
    review_memo: reviewMemo,
    updated_at: FieldValue.serverTimestamp(),
  };
}

function buildProductOptionRecords(
  draft: Record<string, unknown>,
  productId: string,
  companyId: string,
  reviewedAt: string,
) {
  const variants = variantRecords(draft.variants ?? draft.skus);

  if (variants.length === 0) {
    return [
      {
        id: productOptionId(productId, "default"),
        option_id: productOptionId(productId, "default"),
        product_id: productId,
        company_id: companyId,
        companyId,
        name: "default",
        option_name: "default",
        price_delta: 0,
        stock: 0,
        inventory: 0,
        status: "active",
        approval_status: "approved",
        product_approval_status: "approved",
        company_approval_status: "approved",
        source_app: "company",
        source_channel: productSourceChannel,
        source: "company_product_editor",
        demo_read_enabled: true,
        guest_write_enabled: true,
        approved_at: reviewedAt,
        updated_at: FieldValue.serverTimestamp(),
      },
    ];
  }

  return variants.map((variant, index) => {
    const rawOptionId = text(variant.id) || `variant-${index + 1}`;
    const optionId = productOptionId(productId, rawOptionId);
    const optionName = text(variant.optionName ?? variant.option_name ?? variant.optionPath ?? variant.option_path) || "default";

    return {
      id: optionId,
      option_id: optionId,
      product_id: productId,
      company_id: companyId,
      companyId,
      name: optionName,
      option_name: optionName,
      price_delta: firstNumber(variant.additionalPrice, variant.price_delta),
      stock: firstNumber(variant.stock, variant.inventory),
      inventory: firstNumber(variant.stock, variant.inventory),
      status: isSuspendedVariant(variant) ? "suspended" : "active",
      approval_status: "approved",
      product_approval_status: "approved",
      company_approval_status: "approved",
      external_option_code: text(variant.externalOptionCode ?? variant.external_option_code),
      sku: text(variant.sku),
      barcode: text(variant.barcode),
      source_app: "company",
      source_channel: productSourceChannel,
      source: "company_product_editor",
      demo_read_enabled: true,
      guest_write_enabled: true,
      approved_at: reviewedAt,
      updated_at: FieldValue.serverTimestamp(),
    };
  });
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<AdminActor | null> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: { code: "ADMIN_PRODUCT_REVIEW_AUTH_REQUIRED", message: "Firebase ID token is required.", httpStatus: 401 },
    });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) {
      return {
        uid: decoded.uid,
        email,
        role: role || (decoded.seed_admin === true ? "seed_admin" : "SUPER_ADMIN"),
      };
    }
  } catch {
    // Return a generic denial below.
  }

  sendJson(response, 403, {
    ok: false,
    error: { code: "ADMIN_PRODUCT_REVIEW_FORBIDDEN", message: "SUPER_ADMIN permission is required.", httpStatus: 403 },
  });
  return null;
}

class ProductReviewError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function isProductReviewStatus(value: unknown): value is ProductReviewStatus {
  return value === "approved" || value === "rejected" || value === "draft";
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function recordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function variantRecords(value: unknown): ProductVariantRecord[] {
  return Array.isArray(value) ? value.filter((item): item is ProductVariantRecord => Boolean(item) && typeof item === "object") : [];
}

function mediaRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function detailSections(value: unknown): Array<{ title: string; body: string }> {
  return mediaRecords(value).map((section) => ({
    title: text(section.title),
    body: text(section.body),
  }));
}

function firstNumber(...values: unknown[]): number {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function maybeNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function cleanPatchRecord(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) target.push(value);
}

function buildApprovedProductEditRecord(
  requestedProductRecord: Record<string, unknown>,
  productId: string,
  companyId: string,
  liveStatus: string,
  reviewedAt: string,
  reviewMemo: string,
) {
  return cleanPatchRecord({
    ...requestedProductRecord,
    id: productId,
    product_id: productId,
    company_id: companyId,
    companyId,
    status: liveStatus,
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    source_app: "admin",
    source_channel: "company_product_edit_approval",
    source: text(requestedProductRecord.source) || "company_product_editor",
    ...productUrlFields(productId, productBusinessNoFromRecord(requestedProductRecord)),
    edited_at: reviewedAt,
    reviewed_at: reviewedAt,
    approved_at: reviewedAt,
    review_memo: reviewMemo,
    updated_at: FieldValue.serverTimestamp(),
  });
}

function buildApprovedDetailEditRecord(
  requestedDetailRecord: Record<string, unknown>,
  productId: string,
  companyId: string,
  reviewedAt: string,
  reviewMemo: string,
) {
  const detailId = text(requestedDetailRecord.id) || text(requestedDetailRecord.product_id) || productId;

  return cleanPatchRecord({
    ...requestedDetailRecord,
    id: detailId,
    product_id: productId,
    company_id: companyId,
    companyId,
    status: "approved",
    approval_status: "approved",
    source_app: "admin",
    source_channel: "company_product_edit_approval",
    edit_mode: true,
    reviewed_at: reviewedAt,
    approved_at: reviewedAt,
    review_memo: reviewMemo,
    updated_at: FieldValue.serverTimestamp(),
  }) as Record<string, unknown> & { id: string };
}

function buildApprovedOptionEditRecord(
  requestedOptionRecord: Record<string, unknown>,
  productId: string,
  companyId: string,
  reviewedAt: string,
  index: number,
) {
  const optionId = text(requestedOptionRecord.id ?? requestedOptionRecord.option_id) || productOptionId(productId, `option-${index + 1}`);
  const status = text(requestedOptionRecord.status) || "active";

  return cleanPatchRecord({
    ...requestedOptionRecord,
    id: optionId,
    option_id: optionId,
    product_id: productId,
    company_id: companyId,
    companyId,
    status,
    approval_status: "approved",
    product_approval_status: "approved",
    company_approval_status: "approved",
    source_app: "admin",
    source_channel: "company_product_edit_approval",
    source: text(requestedOptionRecord.source) || "company_product_editor",
    reviewed_at: reviewedAt,
    approved_at: reviewedAt,
    updated_at: FieldValue.serverTimestamp(),
  }) as Record<string, unknown> & { id: string };
}

function liveProductStatusFor(requestedStatus: string, currentStatus: string) {
  const normalized = requestedStatus.toLowerCase();
  if (["approved", "active"].includes(normalized)) return "active";
  if (["suspended", "archived", "paused", "hidden", "inactive", "disabled"].includes(normalized)) return "suspended";
  if (["active", "approved", "suspended", "paused"].includes(currentStatus)) return currentStatus;
  return "active";
}

function calculateDiscountAmount(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || !Number.isFinite(salePrice)) return 0;
  return Math.max(0, Math.round(referencePrice - salePrice));
}

function calculateDiscountRate(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
  return Math.max(0, Math.round((calculateDiscountAmount(referencePrice, salePrice) / referencePrice) * 100));
}

function calculateSignedDifference(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || !Number.isFinite(salePrice)) return 0;
  return Math.round(referencePrice - salePrice);
}

function calculateSignedDifferenceRate(referencePrice: number, salePrice: number) {
  if (!Number.isFinite(referencePrice) || referencePrice <= 0) return 0;
  return Math.round((calculateSignedDifference(referencePrice, salePrice) / referencePrice) * 100);
}

function isProductPriceComparisonVerified(input: { listPrice: number; platformLowestPrice: number; closedMallPrice: number }) {
  return (
    Number.isFinite(input.listPrice) &&
    Number.isFinite(input.platformLowestPrice) &&
    Number.isFinite(input.closedMallPrice) &&
    input.listPrice >= input.platformLowestPrice &&
    input.platformLowestPrice > input.closedMallPrice &&
    input.closedMallPrice > 0
  );
}

function productPriceComparisonStatus(input: { listPrice: number; platformLowestPrice: number; closedMallPrice: number }) {
  const comparisonComplete = input.listPrice > 0 && input.platformLowestPrice > 0;
  if (!comparisonComplete) return "pending_verification";
  return isProductPriceComparisonVerified(input) ? "verified" : "needs_review";
}

function calculateProductPriceMetrics(input: { listPrice: number; platformLowestPrice: number; closedMallPrice: number }) {
  if (!isProductPriceComparisonVerified(input)) {
    return {
      normalDiscountAmount: 0,
      platformDiscountAmount: 0,
      normalDiscountRate: 0,
      platformDiscountRate: 0,
    };
  }

  return {
    normalDiscountAmount: calculateDiscountAmount(input.listPrice, input.closedMallPrice),
    platformDiscountAmount: calculateSignedDifference(input.platformLowestPrice, input.closedMallPrice),
    normalDiscountRate: calculateDiscountRate(input.listPrice, input.closedMallPrice),
    platformDiscountRate: calculateSignedDifferenceRate(input.platformLowestPrice, input.closedMallPrice),
  };
}

function productOptionId(productId: string, optionId: string) {
  const normalizedOptionId = optionId.trim() || "default";
  if (normalizedOptionId.startsWith(`${productId}-`) || normalizedOptionId.startsWith("opt-")) return normalizedOptionId;
  return `${productId}-${normalizedOptionId}`;
}

function isSuspendedVariant(variant: ProductVariantRecord) {
  const status = text(variant.status).toLowerCase();
  return ["suspended", "paused", "hidden", "inactive", "disabled"].includes(status);
}
