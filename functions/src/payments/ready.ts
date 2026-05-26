import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { validateFirestoreQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPaymentReadyTransactionPlan } from "../utils/firestoreTransaction";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import {
  calculateItemsAmount,
  makeOrderNo,
  makePaymentIntentId,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CartItemInput,
  type CompanyMerchantProfile,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentReadyRequest,
  type PaymentReadyResponse,
  type PaymentProviderId,
  type ServerPaymentIntent,
  type ServerPricedItem,
} from "./types";

const allowedMerchantStatuses: CompanyMerchantProfile["merchantStatus"][] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];
const providerIds: PaymentProviderId[] = ["mock", "pg_contract", "infiny", "toss", "portone", "kcp", "nice"];

export async function paymentsReadyHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentReadyRequest>(request);
  const qrSessionId = String(body.qrSessionId ?? "");

  if (!qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_READY_INPUT_INVALID",
        message: "qrSessionId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  let qrValidation;
  try {
    qrValidation = await validateFirestoreQrSession(qrSessionId);
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "PAYMENT_READY_QR_READ_FAILED",
        message: error instanceof Error ? error.message : "Unknown QR session read error.",
        httpStatus: 503,
      },
    });
    return;
  }

  if (!qrValidation.ok) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: qrValidation.code,
        message: qrValidation.message,
        httpStatus: 409,
      },
    });
    return;
  }

  const items = normalizeCartItems(body.items).length
    ? normalizeCartItems(body.items)
    : normalizeCartItems(qrValidation.session?.itemsSnapshot);

  if (items.length === 0) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_READY_ITEMS_REQUIRED",
        message: "At least one cart or QR snapshot item is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  let pricedItems: ServerPricedItem[];
  try {
    pricedItems = await readServerPricedItems(items);
  } catch (error) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_PRODUCT_VALIDATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown product validation error.",
        httpStatus: 409,
      },
    });
    return;
  }

  const companyIds = new Set(pricedItems.map((item) => item.companyId).filter(Boolean));
  if (companyIds.size > 1) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_COMPANY_GROUP_REQUIRED",
        message: "One payment QR can contain items from only one company/MID. Create a separate QR for each company group.",
        httpStatus: 409,
        details: { companyIds: [...companyIds] },
      },
    });
    return;
  }
  const companyId = [...companyIds][0] ?? "";
  const pgReadiness = getPgServerReadiness();
  const merchantProfile = await readCompanyMerchantProfile(companyId);

  if (pgReadiness.provider !== "mock" && !merchantProfile.paymentReady) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_COMPANY_MID_REQUIRED",
        message: "This company does not have an active Infiny MID. Register and activate the company MID before real payment.",
        httpStatus: 409,
        details: {
          companyId,
          merchantStatus: merchantProfile.merchantStatus,
          merchantIdMasked: merchantProfile.merchantIdMasked,
          moduleKeyMasked: merchantProfile.moduleKeyMasked,
        },
      },
    });
    return;
  }

  const recalculatedAmount = calculateItemsAmount(pricedItems);
  const amountAssertion = assertAmount(body.clientAmount ?? qrValidation.session?.totalAmountSnapshot, recalculatedAmount);

  if (!amountAssertion.ok) {
    sendJson(response, amountAssertion.error.httpStatus, { ok: false, error: amountAssertion.error });
    return;
  }

  const now = new Date();
  const paymentIntent: ServerPaymentIntent = {
    id: makePaymentIntentId(qrSessionId, now),
    qrSessionId,
    orderNoCandidate: makeOrderNo(now),
    amount: recalculatedAmount,
    currency: "KRW",
    provider: "mock",
    companyId,
    merchantId: merchantProfile.merchantId,
    moduleKey: merchantProfile.moduleKey,
    merchantStatus: merchantProfile.merchantStatus,
    status: "ready_mock",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
  };

  try {
    const db = getAdminDb();
    const intentRef = db.collection("payment_intents").doc(paymentIntent.id);
    const auditRef = db.collection("audit_logs").doc();

    await db.runTransaction(async (transaction) => {
      transaction.set(
        intentRef,
        {
          ...paymentIntent,
          items: pricedItems.map(toSnapshotItem),
          client_amount: body.clientAmount ?? null,
          recalculated_amount: recalculatedAmount,
          short_code: body.shortCode ?? qrValidation.session?.shortCode ?? null,
          cart_id: body.cartId ?? null,
          nursery_id: body.nurseryId ?? qrValidation.session?.nurseryId ?? null,
          room_id: body.roomId ?? qrValidation.session?.roomId ?? null,
          tablet_id: body.tabletId ?? qrValidation.session?.tabletId ?? null,
          provider: "mock",
          pg_provider: merchantProfile.provider,
          company_id: merchantProfile.companyId,
          company_name: merchantProfile.companyName,
          merchant_id: merchantProfile.merchantId ?? null,
          merchant_id_masked: merchantProfile.merchantIdMasked,
          pg_module_key: merchantProfile.moduleKey ?? null,
          pg_module_key_masked: merchantProfile.moduleKeyMasked,
          merchant_status: merchantProfile.merchantStatus,
          merchant_payment_ready: merchantProfile.paymentReady,
          pg_ready: pgReadiness.readyForAdapter && merchantProfile.paymentReady,
          source: "firebase_functions_mock_ready",
          demo_read_enabled: true,
          guest_lookup_enabled: true,
          created_at: now.toISOString(),
          expires_at: paymentIntent.expiresAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(auditRef, {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: "payment_ready",
            target: paymentIntent.id,
            severity: "info",
            message: "Payment ready created with Firestore product amount recalculation.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore write error.";
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "PAYMENT_READY_FIRESTORE_WRITE_FAILED",
        message,
        httpStatus: 503,
      },
    });
    return;
  }

  const result: PaymentReadyResponse = {
    ok: true,
    provider: "mock",
    pgReady: pgReadiness.readyForAdapter && merchantProfile.paymentReady,
    pgReadiness,
    paymentIntentId: paymentIntent.id,
    orderNoCandidate: paymentIntent.orderNoCandidate,
    qrSessionId,
    recalculatedAmount,
    currency: "KRW",
    merchantProfile,
    expiresAt: paymentIntent.expiresAt,
    firestoreTransactionPlan: [...getPaymentReadyTransactionPlan(), ...getPgAdapterHandoffPlan()],
    message: pgReadiness.readyForAdapter
      ? "Mock payment intent is ready and server keys are present. Wire the approved PG adapter next."
      : "Mock payment intent is ready. Real PG module remains blocked until keys and adapter are approved.",
  };

  sendJson(response, 200, result);
}

async function readCompanyMerchantProfile(companyId: string): Promise<CompanyMerchantProfile> {
  const fallback: CompanyMerchantProfile = {
    companyId,
    companyName: companyId || "unknown company",
    provider: "infiny",
    merchantIdMasked: "MID 발급 대기",
    moduleKeyMasked: "모듈 키 대기",
    merchantStatus: "not_applied",
    paymentReady: false,
  };

  if (!companyId) return fallback;

  const snapshot = await getAdminDb().collection("companies").doc(companyId).get();
  if (!snapshot.exists) return fallback;

  const data = snapshot.data() ?? {};
  const pgProfile = asRecord(data.pg_profile ?? data.pgProfile);
  const merchantId = optionalString(
    data.infiny_mid ??
      data.pg_merchant_id ??
      data.merchantId ??
      pgProfile.infiny_mid ??
      pgProfile.pg_merchant_id ??
      pgProfile.merchantId,
  );
  const moduleKey = optionalString(
    data.pg_module_key ??
      data.infiny_module_key ??
      data.moduleKey ??
      data.channelKey ??
      pgProfile.pg_module_key ??
      pgProfile.infiny_module_key ??
      pgProfile.moduleKey,
  );
  const merchantStatus = asMerchantStatus(
    data.infiny_mid_status ?? data.pg_merchant_status ?? data.merchantStatus ?? pgProfile.merchantStatus,
  );

  return {
    companyId: String(data.company_id ?? data.companyId ?? companyId),
    companyName: String(data.name ?? data.company_name ?? companyId),
    provider: asPaymentProviderId(data.pg_provider ?? pgProfile.provider ?? "infiny"),
    merchantId,
    merchantIdMasked: maskMerchantId(merchantId),
    moduleKey,
    moduleKeyMasked: maskModuleKey(moduleKey),
    merchantStatus,
    paymentReady: Boolean(merchantId && moduleKey && merchantStatus === "active"),
  };
}

function maskMerchantId(merchantId?: string): string {
  if (!merchantId) return "MID 발급 대기";
  if (merchantId.length <= 8) return merchantId;
  return `${merchantId.slice(0, 4)}-${"*".repeat(Math.max(merchantId.length - 9, 4))}-${merchantId.slice(-4)}`;
}

function maskModuleKey(moduleKey?: string): string {
  if (!moduleKey) return "모듈 키 대기";
  if (moduleKey.length <= 8) return moduleKey;
  return `${moduleKey.slice(0, 4)}-${"*".repeat(Math.max(moduleKey.length - 8, 4))}-${moduleKey.slice(-4)}`;
}

function asPaymentProviderId(value: unknown): PaymentProviderId {
  return providerIds.includes(value as PaymentProviderId) ? (value as PaymentProviderId) : "infiny";
}

function asMerchantStatus(value: unknown): CompanyMerchantProfile["merchantStatus"] {
  return allowedMerchantStatuses.includes(value as CompanyMerchantProfile["merchantStatus"])
    ? (value as CompanyMerchantProfile["merchantStatus"])
    : "not_applied";
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

async function readServerPricedItems(items: CartItemInput[]): Promise<ServerPricedItem[]> {
  const db = getAdminDb();
  const pricedItems: ServerPricedItem[] = [];

  for (const item of items) {
    const snapshot = await db.collection("products").doc(item.productId).get();

    if (!snapshot.exists) {
      throw new Error(`Product ${item.productId} was not found.`);
    }

    const data = snapshot.data() ?? {};
    const status = String(data.status ?? "");

    if (status !== "active" && status !== "approved") {
      throw new Error(`Product ${item.productId} is not active or approved.`);
    }

    const inventory = asNumber(data.inventory ?? data.stock, 0);
    const reservedInventory = asNumber(data.reserved_inventory, 0);
    const availableInventory = inventory - reservedInventory;

    if (availableInventory < item.quantity) {
      throw new Error(`Product ${item.productId} is out of stock.`);
    }

    pricedItems.push({
      ...item,
      productName: String(data.title ?? data.name ?? item.productName),
      unitPrice: asNumber(data.closed_mall_price ?? data.price, item.unitPrice),
      companyId: String(data.company_id ?? item.companyId),
      status,
      inventory,
      reservedInventory,
      availableInventory,
      source: "firestore_products",
    });
  }

  return pricedItems;
}

function toSnapshotItem(item: ServerPricedItem) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    company_id: item.companyId,
    line_amount: item.unitPrice * item.quantity,
    inventory_at_ready: item.inventory,
    reserved_inventory_at_ready: item.reservedInventory,
    available_inventory_at_ready: item.availableInventory,
    source: item.source,
  };
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
