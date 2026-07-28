import { FieldValue } from "firebase-admin/firestore";
import { canWriteCompanyScope, type A5AuthClaims } from "../auth/verifyClaims";
import { publishStorefrontRuntimeSnapshot } from "../commerce/storefrontSnapshot";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type RecordData = Record<string, unknown>;

type CompanyProductUpsertRequest = {
  product?: RecordData;
  detailPage?: RecordData;
  options?: RecordData[];
  suspendedOptions?: RecordData[];
  supplyProfile?: RecordData;
  operation?: "publish" | "update" | "bulk";
};

const visibleApproval = "approved";

type ProductPriceValues = {
  listPrice: number;
  openMallPrice: number;
  closedMallPrice: number;
};

class ProductPriceValidationError extends Error {
  readonly code = "COMPANY_PRODUCT_PRICE_ORDER_INVALID";
}

function readProductPriceValues(input: RecordData): ProductPriceValues {
  const comparison = record(input.comparison);
  return {
    listPrice: amount(
      input.list_price ??
        input.listPrice ??
        input.normal_price ??
        input.normalPrice ??
        comparison.listPrice,
    ),
    openMallPrice: amount(
      input.open_mall_price ??
        input.openMallPrice ??
        input.platform_lowest_price ??
        input.platformLowestPrice ??
        comparison.platformLowestPrice,
    ),
    closedMallPrice: amount(
      input.closed_mall_price ??
        input.closedMallPrice ??
        input.final_sale_price ??
        input.finalSalePrice ??
        input.price ??
        input.sale_price ??
        input.salePrice ??
        comparison.closedMallPrice,
    ),
  };
}

function assertProductPriceOrder(input: RecordData): void {
  const { listPrice, openMallPrice, closedMallPrice } = readProductPriceValues(input);
  const hasListPrice = listPrice > 0;
  const hasOpenMallPrice = openMallPrice > 0;

  if (closedMallPrice <= 0) {
    throw new ProductPriceValidationError("폐쇄몰 판매가를 입력해야 합니다.");
  }

  if (hasListPrice !== hasOpenMallPrice) {
    throw new ProductPriceValidationError("원판매가와 오픈몰 판매가는 함께 입력하거나 함께 비워야 합니다.");
  }
}

export async function companyProductUpsertHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<CompanyProductUpsertRequest>(request);
  const product = record(body.product);
  const detailPage = record(body.detailPage);
  const options = records(body.options);
  const suspendedOptions = records(body.suspendedOptions);
  const supplyProfile = record(body.supplyProfile);
  const productId = text(product.id ?? product.product_id ?? product.productId ?? detailPage.id ?? detailPage.product_id ?? detailPage.productId);
  const requestedCompanyId = text(product.company_id ?? product.companyId ?? detailPage.company_id ?? detailPage.companyId);

  if (!productId || !requestedCompanyId || !Object.keys(product).length || !Object.keys(detailPage).length) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "COMPANY_PRODUCT_UPSERT_REQUEST_INVALID",
        message: "product, detailPage, productId, and companyId are required.",
      },
    });
    return;
  }

  const token = authorizationToken(request);
  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_UPSERT_AUTH_REQUIRED", message: "Firebase ID token is required." },
    });
    return;
  }

  const claims = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!claims || !canWriteCompanyScope(claims as A5AuthClaims, requestedCompanyId)) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "COMPANY_PRODUCT_UPSERT_FORBIDDEN", message: "The signed-in company account cannot save this product." },
    });
    return;
  }

  const db = getAdminDb();
  const now = new Date().toISOString();
  const productRef = db.collection("products").doc(productId);
  const detailRef = db.collection("product_detail_pages").doc(productId);
  const supplyRef = db.collection("product_supply_profiles").doc(productId);
  try {
    assertProductPriceOrder(product);
    const existingBulkOptions = body.operation === "bulk"
      ? await db.collection("product_options").where("product_id", "==", productId).get()
      : null;
    const incomingOptionIds = new Set(
      options.map((option) => text(option.id ?? option.option_id ?? option.optionId)).filter(Boolean),
    );
    const company = await readCompanyIdentity(db, requestedCompanyId, claims as Record<string, unknown>, product);

    await db.runTransaction(async (transaction) => {
      const existingProduct = await transaction.get(productRef);
      if (existingProduct.exists && !sameCompany(existingProduct.data() ?? {}, requestedCompanyId, company.businessNo)) {
        throw new Error("COMPANY_PRODUCT_SCOPE_MISMATCH");
      }

      const normalizedProduct = productDocument(product, productId, requestedCompanyId, company, now);
      const normalizedDetail = detailDocument(detailPage, productId, requestedCompanyId, company, now);
      const removedLegacySupplierFields = body.operation === "bulk" ? {
        supply_unit_price: FieldValue.delete(),
        supplyUnitPrice: FieldValue.delete(),
        brix_check_image_url: FieldValue.delete(),
        brixCheckImageUrl: FieldValue.delete(),
      } : {};

      transaction.set(productRef, { ...normalizedProduct, ...removedLegacySupplierFields }, { merge: true });
      transaction.set(detailRef, { ...normalizedDetail, ...removedLegacySupplierFields }, { merge: true });
      if (Object.keys(supplyProfile).length) {
        const normalizedSupplyProfile = sanitize({
          ...supplyProfile,
          id: productId,
          product_id: productId,
          company_id: requestedCompanyId,
          updated_at_iso: now,
        });
        transaction.set(supplyRef, {
          ...normalizedSupplyProfile,
          ...removedLegacySupplierFields,
          updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      for (const option of options) {
        const optionId = text(option.id ?? option.option_id ?? option.optionId);
        if (!optionId) throw new Error("COMPANY_PRODUCT_OPTION_ID_REQUIRED");
        transaction.set(db.collection("product_options").doc(optionId), optionDocument(option, optionId, productId, requestedCompanyId, company, now, "active"), { merge: true });
      }
      if (existingBulkOptions) {
        for (const existingOption of existingBulkOptions.docs) {
          if (incomingOptionIds.has(existingOption.id)) continue;
          transaction.set(existingOption.ref, {
            status: "suspended",
            moderation_status: "registered",
            suspended_reason: "bulk_upload_option_removed",
            updated_at_iso: now,
            updated_at: FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }

      for (const option of suspendedOptions) {
        const optionId = text(option.id ?? option.option_id ?? option.optionId);
        if (!optionId) continue;
        transaction.set(db.collection("product_options").doc(optionId), optionDocument(option, optionId, productId, requestedCompanyId, company, now, "suspended"), { merge: true });
      }

      transaction.set(db.collection("audit_logs").doc(`company-product-upsert-${productId}-${Date.now()}`), {
        type: "company_product_upsert",
        action: text(body.operation, "publish"),
        product_id: productId,
        company_id: requestedCompanyId,
        actor_uid: claims.uid,
        option_count: options.length,
        suspended_option_count: suspendedOptions.length + (existingBulkOptions?.docs.filter((item) => !incomingOptionIds.has(item.id)).length ?? 0),
        supply_profile_saved: Object.keys(supplyProfile).length > 0,
        created_at: FieldValue.serverTimestamp(),
      });
    });

    const snapshot = await publishStorefrontRuntimeSnapshot(db, `company_product_${text(body.operation, "publish")}:${productId}`);

    sendJson(response, 200, {
      ok: true,
      productId,
      companyId: requestedCompanyId,
      snapshotPublished: true,
      snapshotVersion: snapshot.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product save failed.";
    const isPriceValidationError = error instanceof ProductPriceValidationError;
    const status = isPriceValidationError ? 400 : message === "COMPANY_PRODUCT_SCOPE_MISMATCH" ? 403 : 500;
    const code = isPriceValidationError ? error.code : message;
    sendJson(response, status, {
      ok: false,
      error: { code, message },
    });
  }
}

async function readCompanyIdentity(
  db: ReturnType<typeof getAdminDb>,
  companyId: string,
  claims: Record<string, unknown>,
  product: RecordData,
) {
  const snapshot = await db.collection("companies").doc(companyId).get();
  const data = snapshot.data() ?? {};
  const businessNo = normalizeBusinessNo(
    data.business_registration_number_normalized ??
      data.business_registration_number ??
      data.businessNo ??
      data.company_business_no ??
      claims.business_no ??
      product.seller_business_no_normalized ??
      product.sellerBusinessNoNormalized ??
      product.seller_business_no ??
      product.sellerBusinessNo,
  );

  return {
    businessNo,
    companyName: text(data.company_name ?? data.companyName ?? data.name ?? product.seller_company_name ?? product.sellerCompanyName),
  };
}
function productDocument(input: RecordData, productId: string, companyId: string, company: { businessNo: string; companyName: string }, now: string) {
  const status = text(input.status).toLowerCase() === "paused" || text(input.status).toLowerCase() === "suspended" ? "paused" : "active";
  const pricing = productPriceFields(input);
  const stock = productStockFields(input);

  const output = sanitize({
    ...input,
    ...pricing,
    ...stock,
    id: productId,
    product_id: productId,
    productId,
    company_id: companyId,
    companyId,
    seller_company_id: companyId,
    sellerCompanyId: companyId,
    pg_owner_company_id: companyId,
    seller_business_no: company.businessNo || undefined,
    sellerBusinessNo: company.businessNo || undefined,
    seller_business_no_normalized: company.businessNo || undefined,
    sellerBusinessNoNormalized: company.businessNo || undefined,
    seller_company_name: company.companyName || undefined,
    sellerCompanyName: company.companyName || undefined,
    status,
    approval_status: visibleApproval,
    product_approval_status: visibleApproval,
    company_approval_status: visibleApproval,
    moderation_status: "registered",
    updated_at_iso: now,
  });
  return { ...output, updated_at: FieldValue.serverTimestamp() };
}
function detailDocument(input: RecordData, productId: string, companyId: string, company: { businessNo: string; companyName: string }, now: string) {
  const output = sanitize({
    ...input,
    id: productId,
    product_id: productId,
    productId,
    company_id: companyId,
    companyId,
    seller_company_id: companyId,
    sellerCompanyId: companyId,
    seller_business_no: company.businessNo || undefined,
    sellerBusinessNo: company.businessNo || undefined,
    seller_business_no_normalized: company.businessNo || undefined,
    sellerBusinessNoNormalized: company.businessNo || undefined,
    seller_company_name: company.companyName || undefined,
    sellerCompanyName: company.companyName || undefined,
    status: visibleApproval,
    approval_status: visibleApproval,
    product_approval_status: visibleApproval,
    company_approval_status: visibleApproval,
    moderation_status: "registered",
    updated_at_iso: now,
  });
  return { ...output, updated_at: FieldValue.serverTimestamp() };
}
function optionDocument(input: RecordData, optionId: string, productId: string, companyId: string, company: { businessNo: string; companyName: string }, now: string, status: "active" | "suspended") {
  const stock = productStockFields(input);
  const output = sanitize({
    ...input,
    ...stock,
    id: optionId,
    option_id: optionId,
    optionId,
    product_id: productId,
    productId,
    company_id: companyId,
    companyId,
    seller_company_id: companyId,
    sellerCompanyId: companyId,
    seller_business_no: company.businessNo || undefined,
    sellerBusinessNo: company.businessNo || undefined,
    seller_business_no_normalized: company.businessNo || undefined,
    sellerBusinessNoNormalized: company.businessNo || undefined,
    seller_company_name: company.companyName || undefined,
    sellerCompanyName: company.companyName || undefined,
    status,
    approval_status: visibleApproval,
    product_approval_status: visibleApproval,
    company_approval_status: visibleApproval,
    moderation_status: "registered",
    updated_at_iso: now,
  });
  return { ...output, updated_at: FieldValue.serverTimestamp() };
}
function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function sameCompany(data: Record<string, unknown>, companyId: string, businessNo: string) {
  const storedCompanyId = text(data.company_id ?? data.companyId ?? data.seller_company_id ?? data.sellerCompanyId);
  if (storedCompanyId === companyId) return true;

  const storedBusinessNo = normalizeBusinessNo(
    data.seller_business_no_normalized ??
      data.sellerBusinessNoNormalized ??
      data.seller_business_no ??
      data.sellerBusinessNo ??
      data.business_registration_number ??
      data.businessNo,
  );
  return Boolean(businessNo) && storedBusinessNo === businessNo;
}

function normalizeBusinessNo(value: unknown) {
  return text(value).replace(/\D/g, "");
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function record(value: unknown): RecordData {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RecordData) : {};
}

function records(value: unknown): RecordData[] {
  return Array.isArray(value) ? value.map(record).filter((item) => Object.keys(item).length > 0) : [];
}

function productPriceFields(input: RecordData) {
  const comparison = record(input.comparison);
  const pricing = record(input.pricing);
  const { listPrice, openMallPrice, closedMallPrice } = readProductPriceValues(input);
  const comparisonComplete = listPrice > 0 && openMallPrice > 0;
  const comparisonOrderValid = comparisonComplete && listPrice >= openMallPrice && openMallPrice > closedMallPrice;
  const requestedStatus = text(
    input.price_comparison_status ?? input.priceComparisonStatus ?? comparison.status,
  );
  const verificationSource = text(
    input.comparison_price_verification_source ??
      input.comparisonPriceVerificationSource ??
      comparison.verificationSource ??
      comparison.sourceUrl,
  );
  const verificationRequested =
    (input.price_comparison_verified === true || input.priceComparisonVerified === true || comparison.verified === true) &&
    requestedStatus === "verified";
  const comparisonVerified = comparisonOrderValid && verificationRequested && Boolean(verificationSource);
  const comparisonStatus = comparisonVerified
    ? "verified"
    : verificationRequested && comparisonComplete
      ? "needs_review"
      : "pending_verification";
  const publicListPrice = comparisonVerified ? listPrice : null;
  const publicOpenMallPrice = comparisonVerified ? openMallPrice : null;
  const discountRate = comparisonVerified
    ? Math.max(0, Math.round(((listPrice - closedMallPrice) / listPrice) * 100))
    : null;
  const aiComparisonAmount = comparisonVerified ? openMallPrice - closedMallPrice : null;

  return {
    price: closedMallPrice,
    sale_price: closedMallPrice,
    salePrice: closedMallPrice,
    list_price: publicListPrice,
    listPrice: publicListPrice,
    open_mall_price: publicOpenMallPrice,
    openMallPrice: publicOpenMallPrice,
    platform_lowest_price: publicOpenMallPrice,
    platformLowestPrice: publicOpenMallPrice,
    closed_mall_price: closedMallPrice,
    closedMallPrice,
    normal_discount_amount: comparisonVerified ? listPrice - closedMallPrice : null,
    normalDiscountAmount: comparisonVerified ? listPrice - closedMallPrice : null,
    discount_rate: discountRate,
    discountRate,
    normal_discount_rate: discountRate,
    normalDiscountRate: discountRate,
    platform_discount_rate: comparisonVerified ? Math.round(((openMallPrice - closedMallPrice) / openMallPrice) * 100) : null,
    platformDiscountRate: comparisonVerified ? Math.round(((openMallPrice - closedMallPrice) / openMallPrice) * 100) : null,
    ai_comparison_amount: aiComparisonAmount,
    aiComparisonAmount,
    platform_discount_amount: aiComparisonAmount,
    platformDiscountAmount: aiComparisonAmount,
    price_comparison_verified: comparisonVerified,
    priceComparisonVerified: comparisonVerified,
    price_comparison_status: comparisonStatus,
    priceComparisonStatus: comparisonStatus,
    comparison_price_verification_source: comparisonVerified ? verificationSource : null,
    comparisonPriceVerificationSource: comparisonVerified ? verificationSource : null,
    pricing: {
      ...pricing,
      listPrice: publicListPrice,
      platformLowestPrice: publicOpenMallPrice,
      closedMallPrice,
      normalDiscountAmount: comparisonVerified ? listPrice - closedMallPrice : null,
      platformDiscountAmount: aiComparisonAmount,
      normalDiscountRate: discountRate,
      platformDiscountRate: comparisonVerified ? Math.round(((openMallPrice - closedMallPrice) / openMallPrice) * 100) : null,
      comparisonComplete: comparisonVerified,
      comparisonVerified,
      comparisonStatus,
    },
    comparison: {
      ...comparison,
      listPrice: publicListPrice,
      platformLowestPrice: publicOpenMallPrice,
      closedMallPrice,
      normalDiscountAmount: comparisonVerified ? listPrice - closedMallPrice : null,
      normalDiscountRate: discountRate,
      platformDiscountAmount: aiComparisonAmount,
      platformDiscountRate: comparisonVerified ? Math.round(((openMallPrice - closedMallPrice) / openMallPrice) * 100) : null,
      verified: comparisonVerified,
      status: comparisonStatus,
      verificationSource: comparisonVerified ? verificationSource : null,
    },
  };
}

function productStockFields(input: RecordData) {
  const value = input.stock ?? input.inventory;
  if (value === undefined || value === null || value === "") return {};
  const stock = amount(value);
  return { stock, inventory: stock };
}

function amount(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : 0;
}

function sanitize(value: unknown): RecordData {
  return sanitizeValue(value) as RecordData;
}

function sanitizeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item)).filter((item) => item !== undefined);
  if (!value || typeof value !== "object") return value;
  return Object.entries(value as RecordData).reduce<RecordData>((result, [key, item]) => {
    const next = sanitizeValue(item);
    if (next !== undefined) result[key] = next;
    return result;
  }, {});
}
