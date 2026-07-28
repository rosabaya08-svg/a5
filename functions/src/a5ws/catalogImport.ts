import { createHash, createHmac, timingSafeEqual } from "crypto";
import { FieldValue, type DocumentData } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import type { Request, Response } from "express";
import { getAdminDb } from "../firebaseAdmin";

const SIGNATURE_TTL_MS = 5 * 60 * 1000;
const PRESERVED_TEST_BUSINESS_NO = "7592901311";
const PRESERVED_TEST_COMPANY_ID = "company-test-1004";

export const A5WS_A5MALL_BRIDGE_SECRET = defineSecret("A5WS_A5MALL_BRIDGE_SECRET");

type FirebaseRequest = Request & { rawBody?: Buffer };

class CatalogImportError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
  ) {
    super(message);
  }
}

export async function a5wsCatalogImportHandler(request: FirebaseRequest, response: Response) {
  try {
    if (request.method !== "POST") {
      throw new CatalogImportError("POST is required.", 405, "METHOD_NOT_ALLOWED");
    }
    const { nonce } = verifyBridgeRequest(request);
    const payload = record(request.body);
    if (text(payload.eventType) !== "a5ws.catalog.upsert" || text(payload.sourceProject) !== "a5s-mall") {
      throw new CatalogImportError("The catalog source is not allowed.", 403, "SOURCE_NOT_ALLOWED");
    }

    const eventId = requiredText(payload.eventId, "eventId");
    const input = record(payload.product);
    const listingId = requiredText(input.listingId, "product.listingId");
    const sourceProductId = requiredText(input.sourceProductId, "product.sourceProductId");
    const sellingPartnerBusinessNo = businessNo(input.sellingPartnerBusinessNo, "product.sellingPartnerBusinessNo");
    const productName = requiredText(input.productName, "product.productName");
    const customerUnitPrice = positiveInteger(input.customerUnitPrice, "product.customerUnitPrice");
    const wholesaleUnitPrice = positiveInteger(input.wholesaleUnitPrice, "product.wholesaleUnitPrice");
    const marginUnitAmount = nonNegativeInteger(input.marginUnitAmount, "product.marginUnitAmount");
    if (customerUnitPrice !== wholesaleUnitPrice + marginUnitAmount) {
      throw new CatalogImportError("The customer price does not match wholesale plus margin.", 409, "PRICE_SPLIT_MISMATCH");
    }
    const commerceProgramId = asProgramChannel(input.commerceProgramId);
    const pgOwnerCompanyId = text(input.pgOwnerCompanyId ?? input.pgMerchantOwnerBusinessId);
    const marginContractVersion = text(input.marginContractVersion);
    if (commerceProgramId && (!pgOwnerCompanyId || !marginContractVersion)) {
      throw new CatalogImportError("Program resale listings require pgOwnerCompanyId and marginContractVersion.", 409, "PROGRAM_RESALE_CONTRACT_REQUIRED");
    }

    const db = getAdminDb();
    const company = await resolveSellingCompany(sellingPartnerBusinessNo);
    assertCompanyCanSell(company.data);
    const companyId = company.id;
    const companyName = companyNameFrom(company.data) || text(input.sellingPartnerName) || sellingPartnerBusinessNo;
    const productId = `a5ws-${sellingPartnerBusinessNo}-${createHash("sha256").update(listingId).digest("hex").slice(0, 20)}`;
    const publicPath = `/a5mall/${sellingPartnerBusinessNo}/${productId}`;
    const brandPath = `/a5mall/${sellingPartnerBusinessNo}`;
    const thumbnailUrl = text(input.thumbnailUrl) || "/file.svg";
    const gallery = uniqueStrings([thumbnailUrl, ...stringArray(input.galleryUrls)]);
    const productOwnerBusinessNo = optionalBusinessNo(input.productOwnerBusinessNo);
    const productOwnerPayupSubMerchantId = text(input.productOwnerPayupSubMerchantId);
    const sellingPartnerPayupSubMerchantId = text(input.sellingPartnerPayupSubMerchantId);
    const settlementReadiness = productOwnerPayupSubMerchantId && sellingPartnerPayupSubMerchantId
      ? "ready_for_private_api_activation"
      : "merchant_ids_required";
    const sourceStatus = text(input.status) || "active";
    const legalDisclosure = normalizeLegalDisclosure(input);
    const status = sourceStatus === "active" && legalDisclosure.ready ? "active" : "paused";
    const stock = nonNegativeInteger(input.stock, "product.stock");
    const categoryName = text(input.categoryName) || "A5WS";
    const shippingFeePolicy = normalizeShippingFeePolicy(input.shippingFeePolicy);
    const nowIso = new Date().toISOString();
    const receiptId = createHash("sha256").update(nonce).digest("hex");
    const receiptRef = db.doc(`a5ws_catalog_import_receipts/${receiptId}`);
    const productRef = db.doc(`products/${productId}`);

    const imported = await db.runTransaction(async (transaction) => {
      const receiptSnapshot = await transaction.get(receiptRef);
      if (receiptSnapshot.exists) return { duplicate: true };

      transaction.create(receiptRef, {
        id: receiptId,
        nonceHash: receiptId,
        eventId,
        listingId,
        productId,
        companyId,
        receivedAt: FieldValue.serverTimestamp(),
        receivedAtIso: nowIso,
      });
      transaction.set(productRef, {
        product_id: productId,
        title: productName,
        name: productName,
        brand: text(input.brandName) || text(input.companyName) || "A5WS",
        subtitle: `${text(input.companyName) || "A5WS"} partner supply`,
        category: categoryName,
        status,
        approval_status: legalDisclosure.ready ? "approved" : "pending_review",
        product_approval_status: legalDisclosure.ready ? "approved" : "pending_review",
        company_approval_status: "approved",
        company_id: companyId,
        seller_company_id: companyId,
        pg_owner_company_id: pgOwnerCompanyId || companyId,
        commerce_program_id: commerceProgramId || null,
        seller_company_name: companyName,
        business_no: sellingPartnerBusinessNo,
        seller_business_no: sellingPartnerBusinessNo,
        seller_business_no_normalized: sellingPartnerBusinessNo,
        company_business_no_normalized: sellingPartnerBusinessNo,
        business_registration_number_normalized: sellingPartnerBusinessNo,
        price: customerUnitPrice,
        closed_mall_price: customerUnitPrice,
        platform_lowest_price: customerUnitPrice,
        list_price: customerUnitPrice,
        inventory: stock,
        stock,
        reserved_inventory: 0,
        image_url: thumbnailUrl,
        gallery,
        tags: uniqueStrings(["A5WS", text(input.sourceSystem).toUpperCase(), categoryName, legalDisclosure.tradeStructure]),
        badges: legalDisclosure.ready ? ["A5WS partner", "법정정보 검토완료"] : ["A5WS partner", "판매 검토중"],
        delivery_available: true,
        pickup_available: false,
        shipping_fee_policy: shippingFeePolicy,
        detail_sections: detailSections(input, thumbnailUrl, legalDisclosure),
        legal_disclosure: legalDisclosure,
        legal_disclosure_ready: legalDisclosure.ready,
        legal_disclosure_version: legalDisclosure.version,
        item_condition: legalDisclosure.itemCondition,
        trade_structure: legalDisclosure.tradeStructure,
        manufacturer: legalDisclosure.manufacturer,
        importer: legalDisclosure.importer,
        country_of_manufacture: legalDisclosure.countryOfManufacture,
        model_code: legalDisclosure.modelCode,
        material: legalDisclosure.material,
        color: legalDisclosure.color,
        size: legalDisclosure.size,
        components: legalDisclosure.components,
        customs_policy: legalDisclosure.customsPolicy,
        shipping_lead_time: legalDisclosure.shippingLeadTime,
        as_provider: legalDisclosure.asProvider,
        as_phone: legalDisclosure.asPhone,
        authenticity_evidence_status: legalDisclosure.authenticityEvidenceStatus,
        custom_made: legalDisclosure.customMade,
        custom_order_notice: legalDisclosure.customOrderNotice,
        third_party_seller: legalDisclosure.thirdPartySeller,
        overseas_data_transfer_required: legalDisclosure.overseasDataTransferRequired,
        public_path: publicPath,
        tablet_path: publicPath,
        mobile_path: publicPath,
        business_brand_path: brandPath,
        business_product_path: publicPath,
        a5mall_brand_path: brandPath,
        a5mall_product_path: publicPath,
        source: "a5ws_catalog_bridge",
        source_project: text(input.sourceProject) || "a5s-mall",
        source_system: text(input.sourceSystem) || "a5ws",
        source_product_id: sourceProductId,
        external_source_product_id: text(input.externalSourceProductId),
        a5ws_listing_id: listingId,
        a5ws_selling_partner_id: text(input.sellingPartnerId),
        selling_partner_business_no: sellingPartnerBusinessNo,
        supplier_business_id: productOwnerBusinessNo || null,
        reseller_business_id: sellingPartnerBusinessNo,
        settlement_recipient_business_id: productOwnerBusinessNo || null,
        partner_payout_unit_amount: wholesaleUnitPrice,
        gross_margin_unit_amount: marginUnitAmount,
        margin_contract_version: marginContractVersion || null,
        product_owner_business_no: productOwnerBusinessNo,
        product_owner_name: text(input.productOwnerName),
        product_owner_payup_sub_merchant_id: productOwnerPayupSubMerchantId,
        selling_partner_payup_sub_merchant_id: sellingPartnerPayupSubMerchantId,
        wholesale_unit_price: wholesaleUnitPrice,
        partner_margin_unit_amount: marginUnitAmount,
        partner_margin_rate: finiteNumber(input.marginRate),
        settlement_mode: commerceProgramId ? "internal_margin_ledger" : "payup_cart_split_pending_contract",
        settlement_readiness: settlementReadiness,
        payup_cart_split_enabled: false,
        payup_cart_split_contract_required: true,
        settlement_split_policy: {
          currency: "KRW",
          productCost: {
            recipientBusinessNo: productOwnerBusinessNo,
            recipientRole: "product_owner",
            payupSubMerchantId: productOwnerPayupSubMerchantId,
            unitAmount: wholesaleUnitPrice,
          },
          partnerMargin: {
            recipientBusinessNo: sellingPartnerBusinessNo,
            recipientRole: "selling_partner",
            payupSubMerchantId: sellingPartnerPayupSubMerchantId,
            unitAmount: marginUnitAmount,
          },
        },
        source_event_id: eventId,
        published_at: FieldValue.serverTimestamp(),
        published_at_iso: nowIso,
        updated_at: FieldValue.serverTimestamp(),
        updated_at_iso: nowIso,
      }, { merge: true });
      transaction.set(db.doc(`a5ws_catalog_import_audit/${createHash("sha256").update(eventId).digest("hex")}`), {
        eventId,
        listingId,
        sourceProductId,
        productId,
        companyId,
        sellingPartnerBusinessNo,
        settlementReadiness,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso,
      }, { merge: true });
      return { duplicate: false };
    });

    response.status(200).json({
      ok: true,
      source: "a5wsCatalogImport",
      productId,
      companyId,
      publicPath,
      settlementReadiness,
      legalDisclosureReady: legalDisclosure.ready,
      payupCheckoutMode: "existing_a5mall_standard",
      payupCartSplitEnabled: false,
      ...imported,
    });
  } catch (error) {
    const importError = error instanceof CatalogImportError
      ? error
      : new CatalogImportError("The A5WS catalog import failed.", 500, "IMPORT_FAILED");
    if (!(error instanceof CatalogImportError)) console.error("a5wsCatalogImport failed", error);
    response.status(importError.statusCode).json({ ok: false, code: importError.code, message: importError.message });
  }
}

function verifyBridgeRequest(request: FirebaseRequest) {
  const timestamp = text(request.get("x-a5-bridge-timestamp"));
  const nonce = text(request.get("x-a5-bridge-nonce"));
  const providedSignature = text(request.get("x-a5-bridge-signature")).toLowerCase();
  const timestampMs = Number(timestamp);
  if (!timestamp || !nonce || !providedSignature || !Number.isFinite(timestampMs)) {
    throw new CatalogImportError("Bridge signature headers are required.", 401, "SIGNATURE_REQUIRED");
  }
  if (Math.abs(Date.now() - timestampMs) > SIGNATURE_TTL_MS) {
    throw new CatalogImportError("The bridge signature has expired.", 401, "SIGNATURE_EXPIRED");
  }
  const secret = A5WS_A5MALL_BRIDGE_SECRET.value();
  if (secret.length < 32) {
    throw new CatalogImportError("The catalog bridge secret is not configured.", 503, "BRIDGE_NOT_CONFIGURED");
  }
  const rawBody = request.rawBody?.toString("utf8") ?? JSON.stringify(request.body ?? {});
  const expectedSignature = createHmac("sha256", secret).update(`${timestamp}.${nonce}.${rawBody}`).digest("hex");
  if (!safeSignatureEqual(expectedSignature, providedSignature)) {
    throw new CatalogImportError("The bridge signature is invalid.", 401, "SIGNATURE_INVALID");
  }
  return { nonce };
}

function safeSignatureEqual(expected: string, provided: string) {
  if (!/^[a-f0-9]{64}$/.test(provided)) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

async function resolveSellingCompany(normalizedBusinessNo: string) {
  const db = getAdminDb();
  const fields = [
    "business_registration_number_normalized",
    "businessRegistrationNumberNormalized",
    "company_business_no_normalized",
    "companyBusinessNoNormalized",
    "business_no_normalized",
  ];
  for (const field of fields) {
    const snapshot = await db.collection("companies").where(field, "==", normalizedBusinessNo).limit(1).get();
    const document = snapshot.docs[0];
    if (document) return { id: document.id, data: document.data() ?? {} };
  }
  if (normalizedBusinessNo === PRESERVED_TEST_BUSINESS_NO) {
    const snapshot = await db.doc(`companies/${PRESERVED_TEST_COMPANY_ID}`).get();
    if (snapshot.exists) return { id: snapshot.id, data: snapshot.data() ?? {} };
  }
  throw new CatalogImportError(
    "The selling partner must be registered and approved in A5Mall before catalog sync.",
    409,
    "SELLING_COMPANY_NOT_FOUND",
  );
}

function assertCompanyCanSell(data: DocumentData) {
  const status = text(data.status).toLowerCase();
  const approval = text(data.approval_status ?? data.approvalStatus).toLowerCase();
  if (["suspended", "blocked", "rejected"].includes(status) || ["pending", "pending_review", "rejected"].includes(approval)) {
    throw new CatalogImportError("The selling partner is not approved for A5Mall sales.", 409, "SELLING_COMPANY_NOT_APPROVED");
  }
}

function companyNameFrom(data: DocumentData) {
  return text(data.name ?? data.company_name ?? data.companyName);
}

function normalizeShippingFeePolicy(value: unknown) {
  const input = record(value);
  return {
    mode: text(input.mode) || "conditional_free",
    baseFee: nonNegativeInteger(input.baseFee ?? 0, "shippingFeePolicy.baseFee"),
    freeThreshold: nonNegativeInteger(input.freeThreshold ?? 0, "shippingFeePolicy.freeThreshold"),
    remoteAreaFee: nonNegativeInteger(input.remoteAreaFee ?? 0, "shippingFeePolicy.remoteAreaFee"),
    jejuIslandFee: nonNegativeInteger(input.jejuIslandFee ?? 0, "shippingFeePolicy.jejuIslandFee"),
  };
}

function detailSections(input: Record<string, unknown>, thumbnailUrl: string, legalDisclosure: ReturnType<typeof normalizeLegalDisclosure>) {
  const sections: Record<string, unknown>[] = [];
  sections.push({
    id: "a5ls-legal-disclosure",
    type: "specification",
    title: "상품정보·판매조건",
    fields: {
      itemCondition: legalDisclosure.itemCondition,
      tradeStructure: legalDisclosure.tradeStructure,
      manufacturer: legalDisclosure.manufacturer,
      importer: legalDisclosure.importer,
      countryOfManufacture: legalDisclosure.countryOfManufacture,
      modelCode: legalDisclosure.modelCode,
      material: legalDisclosure.material,
      color: legalDisclosure.color,
      size: legalDisclosure.size,
      components: legalDisclosure.components,
      customsPolicy: legalDisclosure.customsPolicy,
      shippingLeadTime: legalDisclosure.shippingLeadTime,
      asProvider: legalDisclosure.asProvider,
      asPhone: legalDisclosure.asPhone,
    },
    sort_order: 0,
  });
  const detailHtml = text(input.detailHtml);
  if (detailHtml) sections.push({ id: "a5ws-detail", type: "html", title: "Product details", body: detailHtml, sort_order: 1 });
  if (thumbnailUrl && thumbnailUrl !== "/file.svg") {
    sections.push({ id: "a5ws-image", type: "image", title: "Product image", asset_url: thumbnailUrl, sort_order: 2 });
  }
  return sections;
}

function normalizeLegalDisclosure(input: Record<string, unknown>) {
  const embedded = record(input.legalDisclosure);
  const value = (key: string) => text(input[key] ?? embedded[key]);
  const itemCondition = value("itemCondition");
  const tradeStructure = value("tradeStructure");
  const manufacturer = value("manufacturer");
  const importer = value("importer");
  const countryOfManufacture = value("countryOfManufacture");
  const modelCode = value("modelCode");
  const material = value("material");
  const color = value("color");
  const size = value("size");
  const components = value("components");
  const customsPolicy = value("customsPolicy");
  const shippingLeadTime = value("shippingLeadTime");
  const asProvider = value("asProvider");
  const asPhone = value("asPhone");
  const authenticityEvidenceStatus = value("authenticityEvidenceStatus");
  const ready = input.legalDisclosureReady === true
    && embedded.ready === true
    && [itemCondition, tradeStructure, manufacturer, importer, countryOfManufacture, modelCode, material, color, size, components, customsPolicy, shippingLeadTime, asProvider, asPhone].every(Boolean)
    && authenticityEvidenceStatus === "verified";
  return {
    version: value("version") || "a5ls-product-legal-2026-07-10-v1",
    ready,
    itemCondition,
    tradeStructure,
    manufacturer,
    importer,
    countryOfManufacture,
    modelCode,
    material,
    color,
    size,
    components,
    customsPolicy,
    shippingLeadTime,
    asProvider,
    asPhone,
    authenticityEvidenceStatus,
    customMade: input.customMade === true || embedded.customMade === true,
    customOrderNotice: value("customOrderNotice"),
    thirdPartySeller: input.thirdPartySeller === true || embedded.thirdPartySeller === true,
    overseasDataTransferRequired: input.overseasDataTransferRequired === true || embedded.overseasDataTransferRequired === true,
  };
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 10000) : "";
}

function requiredText(value: unknown, name: string) {
  const result = text(value);
  if (!result) throw new CatalogImportError(`${name} is required.`, 400, "INVALID_ARGUMENT");
  return result;
}

function businessNo(value: unknown, name: string) {
  const result = text(value).replace(/\D/g, "");
  if (result.length !== 10) throw new CatalogImportError(`${name} must contain 10 digits.`, 400, "INVALID_BUSINESS_NO");
  return result;
}

function optionalBusinessNo(value: unknown) {
  const result = text(value).replace(/\D/g, "");
  return result.length === 10 ? result : "";
}

function positiveInteger(value: unknown, name: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 1 || result > 1000000000) {
    throw new CatalogImportError(`${name} must be a positive integer.`, 400, "INVALID_ARGUMENT");
  }
  return result;
}

function nonNegativeInteger(value: unknown, name: string) {
  const result = Number(value);
  if (!Number.isInteger(result) || result < 0 || result > 10000000000000) {
    throw new CatalogImportError(`${name} must be a non-negative integer.`, 400, "INVALID_ARGUMENT");
  }
  return result;
}

function finiteNumber(value: unknown) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, 30);
}

function asProgramChannel(value: unknown): "a5s" | "a5ws" | "a5ls" | undefined {
  return value === "a5s" || value === "a5ws" || value === "a5ls" ? value : undefined;
}
