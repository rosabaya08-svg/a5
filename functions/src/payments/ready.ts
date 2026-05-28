import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { validateFirestoreQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPaymentReadyTransactionPlan } from "../utils/firestoreTransaction";
import { getPgAdapterHandoffPlan, getPgServerReadiness, isInnopaySmsApiMode } from "./providerRuntime";
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
  type PgClientRuntimeConfig,
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
  const pgClientConfig = await readPgClientRuntimeConfig(merchantProfile.provider);
  const resolvedProvider: PaymentProviderId = merchantProfile.paymentReady
    ? merchantProfile.provider
    : pgReadiness.provider === "mock"
      ? "mock"
      : merchantProfile.provider;
  const realPgRequested = resolvedProvider !== "mock";
  const firestoreRuntimeReady = await hasFirestorePgRuntimeEndpoint();
  const realPgRuntimeReady = isInnopaySmsApiMode(merchantProfile.provider) || firestoreRuntimeReady || pgReadiness.readyForAdapter;

  if (realPgRequested && !isInnopaySmsApiMode(merchantProfile.provider) && !firestoreRuntimeReady && !pgReadiness.confirmUrl && !pgReadiness.apiBaseUrl) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_SERVER_KEYS_REQUIRED",
        message: "Infiny endpoint config is missing. Fill Firebase PG provider settings before real payment.",
        httpStatus: 409,
        details: {
          provider: pgReadiness.provider,
          missingKeys: pgReadiness.missingKeys,
        },
      },
    });
    return;
  }

  if (realPgRequested && !merchantProfile.paymentReady) {
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
    provider: resolvedProvider,
    companyId,
    merchantId: merchantProfile.merchantId,
    merchantSerialNo: merchantProfile.merchantSerialNo,
    moduleKey: merchantProfile.moduleKey,
    terminalId: merchantProfile.terminalId,
    merchantStatus: merchantProfile.merchantStatus,
    status: resolvedProvider === "mock" ? "ready_mock" : "ready",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString(),
  };
  const paymentIntentDocument = {
    ...paymentIntent,
    merchantId: paymentIntent.merchantId ?? null,
    merchantSerialNo: paymentIntent.merchantSerialNo ?? null,
    moduleKey: paymentIntent.moduleKey ?? null,
    terminalId: paymentIntent.terminalId ?? null,
    merchantStatus: paymentIntent.merchantStatus ?? null,
  };

  try {
    const db = getAdminDb();
    const intentRef = db.collection("payment_intents").doc(paymentIntent.id);
    const auditRef = db.collection("audit_logs").doc();

    await db.runTransaction(async (transaction) => {
      transaction.set(
        intentRef,
        {
          ...paymentIntentDocument,
          items: pricedItems.map(toSnapshotItem),
          client_amount: body.clientAmount ?? null,
          recalculated_amount: recalculatedAmount,
          short_code: body.shortCode ?? qrValidation.session?.shortCode ?? null,
          cart_id: body.cartId ?? null,
          nursery_id: body.nurseryId ?? qrValidation.session?.nurseryId ?? null,
          room_id: body.roomId ?? qrValidation.session?.roomId ?? null,
          tablet_id: body.tabletId ?? qrValidation.session?.tabletId ?? null,
          provider: resolvedProvider,
          pg_provider: merchantProfile.provider,
          company_id: merchantProfile.companyId,
          company_name: merchantProfile.companyName,
          merchant_id: merchantProfile.merchantId ?? null,
          merchant_id_masked: merchantProfile.merchantIdMasked,
          merchant_serial_no: merchantProfile.merchantSerialNo ?? null,
          merchant_serial_no_masked: merchantProfile.merchantSerialNoMasked ?? null,
          pg_module_key: merchantProfile.moduleKey ?? null,
          pg_module_key_masked: merchantProfile.moduleKeyMasked,
          terminal_id: merchantProfile.terminalId ?? null,
          terminal_id_masked: merchantProfile.terminalIdMasked ?? null,
          secret_key_ref: merchantProfile.secretKeyRef ?? null,
          merchant_password_ref: merchantProfile.merchantPasswordRef ?? null,
          sign_key_ref: merchantProfile.signKeyRef ?? null,
          webhook_secret_ref: merchantProfile.webhookSecretRef ?? null,
          merchant_status: merchantProfile.merchantStatus,
          merchant_payment_ready: merchantProfile.paymentReady,
          pg_ready: realPgRequested ? merchantProfile.paymentReady && realPgRuntimeReady : pgReadiness.readyForAdapter,
          pg_runtime_ready: realPgRuntimeReady,
          source: resolvedProvider === "mock" ? "firebase_functions_mock_ready" : "firebase_functions_pg_ready",
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
    provider: resolvedProvider,
    pgReady: realPgRequested ? merchantProfile.paymentReady && realPgRuntimeReady : pgReadiness.readyForAdapter,
    pgReadiness,
    paymentIntentId: paymentIntent.id,
    orderNoCandidate: paymentIntent.orderNoCandidate,
    qrSessionId,
    recalculatedAmount,
    currency: "KRW",
    merchantProfile,
    pgClientConfig,
    expiresAt: paymentIntent.expiresAt,
    firestoreTransactionPlan: [...getPaymentReadyTransactionPlan(), ...getPgAdapterHandoffPlan()],
    message: realPgRequested && merchantProfile.paymentReady && realPgRuntimeReady
      ? "Payment intent is ready for the configured Firebase PG runtime."
      : resolvedProvider === "mock"
        ? "Mock payment intent is ready."
        : "Real PG remains blocked until company credentials and Infiny runtime settings are complete.",
  };

  sendJson(response, 200, result);
}

async function readPgClientRuntimeConfig(provider: PaymentProviderId): Promise<PgClientRuntimeConfig | undefined> {
  try {
    const db = getAdminDb();
    const providerDocId = provider === "pg_contract" ? "infiny" : provider;
    const [providerSnapshot, legacySnapshot] = await Promise.all([
      db.collection("pg_provider_settings").doc(providerDocId).get(),
      db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get(),
    ]);
    const legacyData = legacySnapshot.data() ?? {};
    const providerData = providerSnapshot.data() ?? {};
    const data = { ...legacyData, ...providerData };
    const clientKey = optionalString(data.public_client_key ?? data.client_key ?? data.clientKey ?? process.env.NEXT_PUBLIC_PG_CLIENT_KEY);
    const channelKey = optionalString(data.channel_key ?? data.channelKey ?? process.env.NEXT_PUBLIC_PG_CHANNEL_KEY);
    const scriptUrl = optionalString(data.script_url ?? data.scriptUrl ?? process.env.NEXT_PUBLIC_PG_SCRIPT_URL);
    const requestFunctionName = optionalString(
      data.request_function_name ?? data.requestFunctionName ?? data.request_method ?? data.requestMethod ?? process.env.NEXT_PUBLIC_PG_REQUEST_FUNCTION,
    );

    if (!clientKey && !channelKey && !scriptUrl && !requestFunctionName) return undefined;

    return {
      provider: asPaymentProviderId(data.provider ?? provider),
      environment: data.environment === "production" ? "production" : "test",
      clientKey,
      channelKey,
      scriptUrl,
      globalName: optionalString(data.global_name ?? data.globalName ?? process.env.NEXT_PUBLIC_PG_GLOBAL_NAME),
      requestFunctionName,
      successUrl: optionalString(data.success_url ?? data.successUrl ?? process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL),
      failUrl: optionalString(data.fail_url ?? data.failUrl ?? process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL),
    };
  } catch {
    return undefined;
  }
}

async function readCompanyMerchantProfile(companyId: string): Promise<CompanyMerchantProfile> {
  const fallback: CompanyMerchantProfile = {
    companyId,
    companyName: companyId || "unknown company",
    provider: "infiny",
    merchantIdMasked: "MID 발급 대기",
    merchantSerialNoMasked: "시리얼 대기",
    moduleKeyMasked: "모듈 키 대기",
    terminalIdMasked: "터미널 대기",
    merchantStatus: "not_applied",
    paymentReady: false,
  };

  if (!companyId) return fallback;

  const db = getAdminDb();
  const credentialSnapshot = await db.collection("company_pg_credentials").doc(companyId).get();
  const companySnapshot = await db.collection("companies").doc(companyId).get();
  if (!credentialSnapshot.exists && !companySnapshot.exists) return fallback;

  const companyData = companySnapshot.data() ?? {};
  const credentialData = credentialSnapshot.data() ?? {};
  const data = { ...companyData, ...credentialData };
  const pgProfile = asRecord(data.pg_profile ?? data.pgProfile);
  const merchantId = optionalString(
    data.mid ??
      data.infiny_mid ??
      data.pg_merchant_id ??
      data.merchant_id ??
      data.merchantId ??
      pgProfile.mid ??
      pgProfile.infiny_mid ??
      pgProfile.pg_merchant_id ??
      pgProfile.merchant_id ??
      pgProfile.merchantId,
  );
  const merchantSerialNo = optionalString(
    data.merchant_serial_no ??
      data.merchantSerialNo ??
      data.serial_no ??
      data.serialNo ??
      pgProfile.merchant_serial_no ??
      pgProfile.merchantSerialNo,
  );
  const moduleKey = optionalString(
    data.pg_module_key ??
      data.infiny_module_key ??
      data.module_key ??
      data.moduleKey ??
      data.channelKey ??
      pgProfile.pg_module_key ??
      pgProfile.infiny_module_key ??
      pgProfile.module_key ??
      pgProfile.moduleKey,
  );
  const terminalId = optionalString(data.terminal_id ?? data.terminalId ?? pgProfile.terminal_id ?? pgProfile.terminalId);
  const secretKeyRef = optionalString(data.secret_key_ref ?? data.secretKeyRef ?? pgProfile.secretKeyRef);
  const merchantPasswordRef = optionalString(
    data.merchant_password_ref ?? data.merchantPasswordRef ?? data.password_ref ?? pgProfile.merchantPasswordRef,
  );
  const signKeyRef = optionalString(data.sign_key_ref ?? data.signKeyRef ?? pgProfile.signKeyRef);
  const webhookSecretRef = optionalString(data.webhook_secret_ref ?? data.webhookSecretRef ?? pgProfile.webhookSecretRef);
  const smsApiMode = isInnopaySmsApiMode(data.pg_provider ?? pgProfile.provider ?? "infiny");
  const hasSecretKey = Boolean(secretKeyRef || hasEncryptedCredential(data.encrypted_secret_key));
  const hasMerchantPassword = Boolean(merchantPasswordRef || hasEncryptedCredential(data.encrypted_merchant_password));
  const hasSignKey = Boolean(signKeyRef || hasEncryptedCredential(data.encrypted_sign_key));
  const hasWebhookSecret = Boolean(webhookSecretRef || hasEncryptedCredential(data.encrypted_webhook_secret));
  const merchantStatus = asMerchantStatus(
    data.credential_status ?? data.infiny_mid_status ?? data.pg_merchant_status ?? data.merchantStatus ?? pgProfile.merchantStatus,
  );

  return {
    companyId: String(data.company_id ?? data.companyId ?? companyId),
    companyName: String(data.name ?? data.company_name ?? data.companyName ?? companyId),
    provider: asPaymentProviderId(data.pg_provider ?? pgProfile.provider ?? "infiny"),
    merchantId,
    merchantIdMasked: maskMerchantId(merchantId),
    merchantSerialNo,
    merchantSerialNoMasked: maskModuleKey(merchantSerialNo),
    moduleKey,
    moduleKeyMasked: maskModuleKey(moduleKey),
    terminalId,
    terminalIdMasked: maskModuleKey(terminalId),
    secretKeyRef,
    merchantPasswordRef,
    signKeyRef,
    webhookSecretRef,
    merchantStatus,
    paymentReady: smsApiMode
      ? Boolean(merchantId && merchantStatus === "active")
      : Boolean(merchantId && moduleKey && merchantSerialNo && hasSecretKey && hasMerchantPassword && hasSignKey && hasWebhookSecret && merchantStatus === "active"),
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

function hasEncryptedCredential(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as { version?: unknown; iv?: unknown; authTag?: unknown; ciphertext?: unknown };
  return candidate.version === "aes-256-gcm:v1" &&
    typeof candidate.iv === "string" &&
    typeof candidate.authTag === "string" &&
    typeof candidate.ciphertext === "string";
}

async function hasFirestorePgRuntimeEndpoint(): Promise<boolean> {
  try {
    const db = getAdminDb();
    const providerSnapshot = await db.collection("pg_provider_settings").doc("infiny").get();
    const legacySnapshot = await db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get();
    const providerData = providerSnapshot.data() ?? {};
    const legacyData = legacySnapshot.data() ?? {};
    const data = { ...legacyData, ...providerData };

    return Boolean(optionalString(data.confirm_url ?? data.confirmUrl) || optionalString(data.api_base_url ?? data.apiBaseUrl));
  } catch {
    return false;
  }
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
