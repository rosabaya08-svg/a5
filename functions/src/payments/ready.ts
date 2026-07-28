import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { readGuestShopEntryToken, readGuestShopSession, verifyGuestShopSessionAccess } from "../guestShop/session";
import { A5_CLOSED_MALL_SOURCE_SITE, a5MemberDocumentFields } from "../identity/source";
import { validateFirestoreQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPaymentReadyTransactionPlan } from "../utils/firestoreTransaction";
import { priceCartItemsFromCatalog } from "./catalogPricing";
import { getPgAdapterHandoffPlan, getPgServerReadiness, isInnopaySmsApiMode, isPayupProvider, readPayupApiBaseUrl } from "./providerRuntime";
import { isLegacyInnopayEnabled } from "./providerPolicy";
import { setPgPaymentLog } from "./pgPaymentLog";
import { calculateCartShippingFee } from "./shippingFee";
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
const taxablePaymentPolicy = {
  taxation_type: "taxable",
  tax_type: "taxable",
  pg_taxation_type: "taxable",
  tax_free_enabled: false,
  is_tax_free_merchant: false,
  tax_free_amt: 0,
  duty_free_amt: 0,
} as const;
const providerIds: PaymentProviderId[] = ["mock", "pg_contract", "payup", "toss", "portone", "kcp", "nice"];
function envFlagEnabled(name: string) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

function allowMockPaymentReady() {
  return envFlagEnabled("A5_ALLOW_MOCK_PAYMENT_READY") || envFlagEnabled("ALLOW_MOCK_PAYMENT_READY");
}

export async function paymentsReadyHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentReadyRequest>(request);
  let qrSessionId = String(body.qrSessionId ?? "");
  const guestShopSessionId = String(body.guestShopSessionId ?? "");

  if (!qrSessionId && !guestShopSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_READY_INPUT_INVALID",
        message: "qrSessionId or guestShopSessionId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  let qrValidation: Awaited<ReturnType<typeof validateFirestoreQrSession>> | undefined;
  let guestShopSession: Awaited<ReturnType<typeof readGuestShopSession>> | null = null;
  try {
    if (guestShopSessionId) {
      const access = await verifyGuestShopSessionAccess(guestShopSessionId, readGuestShopEntryToken(request, body));
      if (!access.ok) {
        sendJson(response, access.error.httpStatus, { ok: false, error: access.error });
        return;
      }

      guestShopSession = access.session;
      qrSessionId = qrSessionId || guestShopSession.qrSessionId;
    } else {
      qrValidation = await validateFirestoreQrSession(qrSessionId);
    }
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

  if (qrValidation && !qrValidation.ok) {
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
    : guestShopSession
      ? guestShopSession.items
      : normalizeCartItems(qrValidation?.session?.itemsSnapshot);

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
  const programIds = new Set(pricedItems.map((item) => item.commerceProgramId).filter(Boolean));
  if (programIds.size > 1) {
    sendJson(response, 409, {
      ok: false,
      error: { code: "PAYMENT_READY_PROGRAM_GROUP_REQUIRED", message: "One payment can contain items from only one commerce program.", httpStatus: 409 },
    });
    return;
  }
  const commerceProgramId = [...programIds][0];
  const sellerIdentity = sellerIdentityFromPricedItems(pricedItems);
  const pgReadiness = getPgServerReadiness();
  const merchantProfile = commerceProgramId
    ? await readProgramMerchantProfile(commerceProgramId, companyId)
    : await readCompanyMerchantProfile(companyId, sellerIdentity.sellerBusinessNoNormalized);
  const pgClientConfig = await readPgClientRuntimeConfig(merchantProfile.provider, merchantProfile.environment);
  const resolvedProvider: PaymentProviderId = merchantProfile.provider;
  const realPgRequested = resolvedProvider !== "mock";
  const firestoreRuntimeReady = await hasFirestorePgRuntimeEndpoint();
  const realPgRuntimeReady = firestoreRuntimeReady || pgReadiness.readyForAdapter;
  const shippingFee = calculateCartShippingFee(pricedItems, {
    deliveryMethod: body.deliveryMethod,
    address: body.receiverAddress,
  });
  const recalculatedAmount = calculateItemsAmount(pricedItems) + shippingFee.totalFee;
  const serverConfirmReady = realPgRequested ? merchantProfile.paymentReady && realPgRuntimeReady : pgReadiness.readyForAdapter;
  const checkoutWindowBlockers = buildCheckoutWindowBlockers({
    merchantProfile,
    pgClientConfig,
    realPgRequested,
    serverConfirmReady,
    realPgRuntimeReady,
  });
  const checkoutWindowReady = realPgRequested ? checkoutWindowBlockers.length === 0 : pgReadiness.readyForAdapter;

  if (resolvedProvider === "mock" && !allowMockPaymentReady()) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_MOCK_PROVIDER_DISABLED",
        message: "Mock payment ready is disabled. Configure a real PG provider/MID or enable A5_ALLOW_MOCK_PAYMENT_READY only for controlled development tests.",
        httpStatus: 409,
        details: {
          companyId,
          pgProvider: pgReadiness.provider,
          merchantStatus: merchantProfile.merchantStatus,
          merchantPaymentReady: merchantProfile.paymentReady,
        },
      },
    });
    return;
  }

  if (realPgRequested && !isPayupProvider(resolvedProvider) && !realPgRuntimeReady) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_SERVER_KEYS_REQUIRED",
        message: "Payup runtime config is missing. Fill Firebase PG provider settings before real payment.",
        httpStatus: 409,
        details: {
          provider: pgReadiness.provider,
          missingKeys: pgReadiness.missingKeys,
        },
      },
    });
    return;
  }

  if (
    realPgRequested &&
    isPayupProvider(resolvedProvider) &&
    (!merchantProfile.merchantId || merchantProfile.merchantStatus === "blocked")
  ) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_COMPANY_MID_REQUIRED",
        message: "This company does not have a Payup merchantId that can open the checkout window.",
        httpStatus: 409,
        details: {
          companyId,
          merchantStatus: merchantProfile.merchantStatus,
          merchantIdMasked: merchantProfile.merchantIdMasked,
          moduleKeyMasked: merchantProfile.moduleKeyMasked,
          checkoutWindowBlockers,
        },
      },
    });
    return;
  }

  if (realPgRequested && !isPayupProvider(resolvedProvider) && !merchantProfile.paymentReady) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "PAYMENT_READY_COMPANY_MID_REQUIRED",
        message: "This company does not have an active Payup merchant profile. Register and activate the company MID before real payment.",
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

  const amountAssertion = assertAmount(body.clientAmount ?? guestShopSession?.totalAmount ?? qrValidation?.session?.totalAmountSnapshot, recalculatedAmount);

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
    sellerBusinessNo: sellerIdentity.sellerBusinessNo,
    sellerBusinessNoNormalized: sellerIdentity.sellerBusinessNoNormalized,
    sellerCompanyName: sellerIdentity.sellerCompanyName,
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
          product_subtotal_amount: shippingFee.productSubtotal,
          shipping_fee: shippingFee.totalFee,
          shipping_base_fee: shippingFee.baseFee,
          shipping_remote_area_fee: shippingFee.remoteAreaFee,
          shipping_area_type: shippingFee.areaType,
          delivery_method_at_ready: body.deliveryMethod ?? null,
          receiver_address_at_ready: body.receiverAddress ?? null,
          short_code: body.shortCode ?? guestShopSession?.shortCode ?? qrValidation?.session?.shortCode ?? null,
          cart_id: body.cartId ?? null,
          nursery_id: body.nurseryId ?? guestShopSession?.nurseryId ?? qrValidation?.session?.nurseryId ?? null,
          room_id: body.roomId ?? guestShopSession?.roomId ?? qrValidation?.session?.roomId ?? null,
          tablet_id: body.tabletId ?? guestShopSession?.tabletId ?? qrValidation?.session?.tabletId ?? null,
          guest_shop_session_id: guestShopSessionId || null,
          provider: resolvedProvider,
          pg_provider: merchantProfile.provider,
          pg_environment: merchantProfile.environment,
          environment: merchantProfile.environment,
          company_id: merchantProfile.companyId,
          company_name: merchantProfile.companyName,
          commerce_program_id: commerceProgramId ?? null,
          seller_company_id: sellerIdentity.sellerCompanyId,
          pg_owner_company_id: companyId,
          seller_business_no: sellerIdentity.sellerBusinessNo ?? null,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          business_registration_number_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          seller_company_name: sellerIdentity.sellerCompanyName ?? merchantProfile.companyName,
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
          ...taxablePaymentPolicy,
          pg_ready: serverConfirmReady,
          checkout_window_ready: checkoutWindowReady,
          checkout_window_blockers: checkoutWindowBlockers,
          pg_runtime_ready: realPgRuntimeReady,
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: resolvedProvider === "mock"
              ? "firebase_functions_mock_ready"
              : "firebase_functions_pg_ready",
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

      setPgPaymentLog(transaction, db, {
        id: `ready-${paymentIntent.id}`,
        functionName: "paymentsReady",
        step: "ready",
        status: paymentIntent.status,
        severity: checkoutWindowReady ? "info" : "warning",
        provider: resolvedProvider,
        companyId: merchantProfile.companyId,
        paymentIntentId: paymentIntent.id,
        qrSessionId,
        guestShopSessionId: guestShopSessionId || undefined,
        orderNo: paymentIntent.orderNoCandidate,
        amount: recalculatedAmount,
        message: checkoutWindowReady
          ? "Payment intent and checkout handoff data were created."
          : "Payment intent was created, but checkout readiness has blockers.",
        developerHint: "Check payment_intents and company_pg_credentials for the same company_id.",
        technicalRefs: {
          merchantStatus: merchantProfile.merchantStatus,
          merchantIdMasked: merchantProfile.merchantIdMasked,
          checkoutWindowBlockers,
          pgRuntimeReady: realPgRuntimeReady,
          serverConfirmReady,
          sellerBusinessNoNormalized: sellerIdentity.sellerBusinessNoNormalized,
        },
        createdAt: now.toISOString(),
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
    pgReady: serverConfirmReady,
    checkoutWindowReady,
    checkoutWindowBlockers,
    pgReadiness,
    paymentIntentId: paymentIntent.id,
    orderNoCandidate: paymentIntent.orderNoCandidate,
    qrSessionId,
    recalculatedAmount,
    productSubtotalAmount: shippingFee.productSubtotal,
    shippingFee: shippingFee.totalFee,
    shippingBaseFee: shippingFee.baseFee,
    shippingRemoteAreaFee: shippingFee.remoteAreaFee,
    shippingAreaType: shippingFee.areaType,
    currency: "KRW",
    merchantProfile,
    pgClientConfig,
    expiresAt: paymentIntent.expiresAt,
    firestoreTransactionPlan: [...getPaymentReadyTransactionPlan(), ...getPgAdapterHandoffPlan()],
    message: realPgRequested && serverConfirmReady
      ? "Payment intent is ready for the configured Firebase PG runtime."
      : realPgRequested && checkoutWindowReady
        ? "Payment intent can open the Payup checkout window, but server confirmation remains blocked until company credentials are active."
      : resolvedProvider === "mock"
        ? "Mock payment intent is ready."
        : "Real PG remains blocked until company credentials and Payup runtime settings are complete.",
  };

  sendJson(response, 200, result);
}

function buildCheckoutWindowBlockers(input: {
  merchantProfile: CompanyMerchantProfile;
  pgClientConfig?: PgClientRuntimeConfig;
  realPgRequested: boolean;
  serverConfirmReady: boolean;
  realPgRuntimeReady: boolean;
}) {
  if (!input.realPgRequested) return [];

  if (isPayupProvider(input.merchantProfile.provider)) {
    return [
      !input.merchantProfile.merchantId ? "PAYMENT_READY_COMPANY_MID_REQUIRED" : "",
      input.merchantProfile.merchantStatus === "blocked" ? "PAYMENT_READY_COMPANY_MID_BLOCKED" : "",
      !input.pgClientConfig?.scriptUrl ? "PAYMENT_READY_PAYUP_SCRIPT_REQUIRED" : "",
    ].filter(Boolean);
  }

  return [
    !input.realPgRuntimeReady ? "PAYMENT_READY_SERVER_KEYS_REQUIRED" : "",
    !input.serverConfirmReady ? "PAYMENT_READY_COMPANY_MID_REQUIRED" : "",
  ].filter(Boolean);
}

async function readPgClientRuntimeConfig(
  provider: PaymentProviderId,
  companyEnvironment: "test" | "production",
): Promise<PgClientRuntimeConfig | undefined> {
  try {
    const db = getAdminDb();
    const providerDocId = provider === "pg_contract" ? "payup" : provider;
    const providerSnapshot = await db.collection("pg_provider_settings").doc(providerDocId).get();
    const legacySnapshot = isLegacyInnopayEnabled()
      ? await db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get()
      : undefined;
    const legacyData = legacySnapshot?.data() ?? {};
    const providerData = providerSnapshot.data() ?? {};
    const data = { ...legacyData, ...providerData };
    const providerId = asPaymentProviderId(data.provider ?? provider);
    const payupDefault = providerId === "payup";
    const innopayBrowserDefault = providerId === "infiny";
    if (payupDefault) {
      return {
        provider: providerId,
        environment: companyEnvironment,
        scriptUrl: companyEnvironment === "production"
          ? "https://standard.payup.co.kr/assets/js/payup_standard-1.0.js"
          : "https://standard.testpayup.co.kr/assets/js/payup_standard_dev-1.0.js",
        requestFunctionName: "goPayupPay",
        checkoutMode: "standard_api",
        paymentMode: "standard",
        successUrl: resolvePayupReturnUrl(optionalString(data.success_url ?? data.successUrl ?? process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL)),
        failUrl: optionalString(data.fail_url ?? data.failUrl ?? process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL),
      };
    }
    const clientKey = optionalString(data.public_client_key ?? data.client_key ?? data.clientKey ?? process.env.NEXT_PUBLIC_PG_CLIENT_KEY);
    const channelKey = optionalString(data.channel_key ?? data.channelKey ?? process.env.NEXT_PUBLIC_PG_CHANNEL_KEY);
    const scriptUrl = optionalString(data.script_url ?? data.scriptUrl ?? process.env.NEXT_PUBLIC_PG_SCRIPT_URL) ||
      (innopayBrowserDefault ? "https://pg.innopay.co.kr/tpay/js/v1/innopay.js" : undefined);
    const requestFunctionName = optionalString(
      data.request_function_name ?? data.requestFunctionName ?? data.request_method ?? data.requestMethod ?? process.env.NEXT_PUBLIC_PG_REQUEST_FUNCTION,
    ) || (innopayBrowserDefault ? "goPay" : undefined);
    const globalName = optionalString(data.global_name ?? data.globalName ?? process.env.NEXT_PUBLIC_PG_GLOBAL_NAME) ||
      (innopayBrowserDefault ? "innopay" : undefined);
    const checkoutMode = optionalString(data.checkout_mode ?? data.checkoutMode ?? data.module_mode ?? data.moduleMode) ||
      (innopayBrowserDefault ? "webview" : undefined);
    const paymentMode = optionalString(data.payment_mode ?? data.paymentMode);


    if (!clientKey && !channelKey && !scriptUrl && !requestFunctionName && !globalName) return undefined;

    return {
      provider: providerId,
      environment: data.environment === "production" ? "production" : "test",
      clientKey,
      channelKey,
      scriptUrl,
      globalName,
      requestFunctionName,
      checkoutMode,
      paymentMode,
      successUrl: optionalString(data.success_url ?? data.successUrl ?? process.env.NEXT_PUBLIC_PAYMENT_SUCCESS_URL),
      failUrl: optionalString(data.fail_url ?? data.failUrl ?? process.env.NEXT_PUBLIC_PAYMENT_FAIL_URL),
    };
  } catch {
    return undefined;
  }
}

function resolvePayupReturnUrl(configuredUrl?: string): string | undefined {
  const projectId = optionalString(process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT) || readFirebaseProjectId();
  if (projectId) {
    return `https://asia-northeast3-${projectId}.cloudfunctions.net/paymentsPayupReturn`;
  }
  return configuredUrl;
}

function readFirebaseProjectId(): string | undefined {
  const raw = process.env.FIREBASE_CONFIG;
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as { projectId?: unknown; project_id?: unknown };
    return optionalString(parsed.projectId ?? parsed.project_id);
  } catch {
    return undefined;
  }
}


async function readProgramMerchantProfile(programId: "a5s" | "a5ws" | "a5ls", expectedPgOwnerCompanyId: string): Promise<CompanyMerchantProfile> {
  const db = getAdminDb();
  const [programSnapshot, credentialSnapshot] = await Promise.all([
    db.collection("commerce_programs").doc(programId).get(),
    db.collection("program_pg_credentials").doc(programId).get(),
  ]);
  const program = programSnapshot.data() ?? {};
  const credential = credentialSnapshot.data() ?? {};
  const pgOwnerCompanyId = optionalString(program.pg_merchant_owner_business_id ?? credential.pg_merchant_owner_business_id) ?? expectedPgOwnerCompanyId;
  if (expectedPgOwnerCompanyId && pgOwnerCompanyId !== expectedPgOwnerCompanyId) {
    throw new Error("PROGRAM_PG_OWNER_MISMATCH:" + programId);
  }
  const merchantId = optionalString(credential.merchant_id ?? credential.merchantId ?? credential.mid);
  const merchantStatus = asMerchantStatus(credential.status ?? credential.credential_status);
  const hasSecretKey = hasEncryptedCredential(credential.encrypted_auth_key) || Boolean(optionalString(credential.auth_key_ref));
  return {
    companyId: pgOwnerCompanyId,
    companyName: optionalString(program.pg_merchant_owner_legal_name) ?? programId,
    provider: "payup",
    environment: credential.environment === "test" ? "test" : "production",
    merchantId,
    merchantIdMasked: maskMerchantId(merchantId),
    moduleKeyMasked: "not_required_for_payup",
    secretKeyRef: optionalString(credential.auth_key_ref),
    merchantStatus,
    paymentReady: Boolean(programSnapshot.exists && credentialSnapshot.exists && merchantId && hasSecretKey && merchantStatus === "active"),
  };
}

async function readCompanyMerchantProfile(companyId: string, businessNoNormalized?: string): Promise<CompanyMerchantProfile> {
  const requestedCompanyId = optionalString(companyId) ?? "";
  const requestedBusinessNoNormalized = normalizeBusinessNoValue(businessNoNormalized);
  const fallback: CompanyMerchantProfile = {
    companyId: requestedCompanyId,
    companyName: requestedCompanyId || "unknown company",
    businessNoNormalized: requestedBusinessNoNormalized,
    provider: "payup",
    environment: "test",
    merchantIdMasked: "MID pending",
    merchantSerialNoMasked: "serial pending",
    moduleKeyMasked: "module pending",
    terminalIdMasked: "terminal pending",
    merchantStatus: "not_applied",
    paymentReady: false,
  };

  if (!requestedCompanyId && !requestedBusinessNoNormalized) return fallback;

  const db = getAdminDb();
  const credentialIdCandidates = uniqueNonEmptyStrings([
    requestedCompanyId,
    requestedBusinessNoNormalized,
    requestedBusinessNoNormalized ? `business-${requestedBusinessNoNormalized}` : undefined,
    requestedBusinessNoNormalized ? `company-${requestedBusinessNoNormalized}` : undefined,
  ]);
  const credentialDocument =
    (await readFirstDocumentByIds(db, "company_pg_credentials", credentialIdCandidates)) ??
    (await readFirstDocumentByBusinessNo(db, "company_pg_credentials", requestedBusinessNoNormalized));
  const credentialData = credentialDocument?.data ?? {};
  const credentialCompanyId = optionalString(
    credentialData.company_id ??
      credentialData.companyId ??
      credentialData.seller_company_id ??
      credentialData.sellerCompanyId ??
      credentialData.pg_owner_company_id,
  );
  const companyDocument =
    (await readFirstDocumentByIds(
      db,
      "companies",
      uniqueNonEmptyStrings([
        requestedCompanyId,
        credentialCompanyId,
        requestedBusinessNoNormalized,
        requestedBusinessNoNormalized ? `business-${requestedBusinessNoNormalized}` : undefined,
        requestedBusinessNoNormalized ? `company-${requestedBusinessNoNormalized}` : undefined,
      ]),
    )) ??
    (await readFirstDocumentByBusinessNo(db, "companies", requestedBusinessNoNormalized));

  if (!credentialDocument && !companyDocument) return fallback;

  const companyData = companyDocument?.data ?? {};
  const data = { ...companyData, ...credentialData };
  const resolvedBusinessNo = optionalString(
    data.business_registration_number ??
      data.businessRegistrationNumber ??
      data.business_no ??
      data.businessNo ??
      data.company_business_no ??
      data.companyBusinessNo ??
      requestedBusinessNoNormalized,
  );
  const resolvedBusinessNoNormalized = normalizeBusinessNoValue(
    data.business_registration_number_normalized ??
      data.businessRegistrationNumberNormalized ??
      data.business_no_normalized ??
      data.businessNoNormalized ??
      data.company_business_no_normalized ??
      data.companyBusinessNoNormalized ??
      resolvedBusinessNo ??
      requestedBusinessNoNormalized,
  );
  const pgProfile = asRecord(data.pg_profile ?? data.pgProfile);
  const merchantId = optionalString(
    data.mid ??
      data.payup_mid ??
      data.pg_merchant_id ??
      data.merchant_id ??
      data.merchantId ??
      pgProfile.mid ??
      pgProfile.payup_mid ??
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
      data.module_key ??
      data.moduleKey ??
      data.channelKey ??
      pgProfile.pg_module_key ??
      pgProfile.module_key ??
      pgProfile.moduleKey,
  );
  const terminalId = optionalString(data.terminal_id ?? data.terminalId ?? pgProfile.terminal_id ?? pgProfile.terminalId);
  const secretKeyRef = optionalString(data.secret_key_ref ?? data.secretKeyRef ?? data.auth_key_ref ?? data.authKeyRef ?? pgProfile.secretKeyRef);
  const merchantPasswordRef = optionalString(
    data.merchant_password_ref ?? data.merchantPasswordRef ?? data.password_ref ?? pgProfile.merchantPasswordRef,
  );
  const signKeyRef = optionalString(data.sign_key_ref ?? data.signKeyRef ?? pgProfile.signKeyRef);
  const webhookSecretRef = optionalString(data.webhook_secret_ref ?? data.webhookSecretRef ?? pgProfile.webhookSecretRef);
  const provider = asPaymentProviderId(data.pg_provider ?? pgProfile.provider ?? "payup");
  const environment = data.environment === "production" ? "production" : "test";
  const smsApiMode = isInnopaySmsApiMode(provider);
  const payupMode = isPayupProvider(provider);
  const hasSecretKey = Boolean(secretKeyRef || hasEncryptedCredential(data.encrypted_secret_key) || hasEncryptedCredential(data.encrypted_auth_key));
  const hasMerchantPassword = Boolean(merchantPasswordRef || hasEncryptedCredential(data.encrypted_merchant_password));
  const hasSignKey = Boolean(signKeyRef || hasEncryptedCredential(data.encrypted_sign_key));
  const hasWebhookSecret = Boolean(webhookSecretRef || hasEncryptedCredential(data.encrypted_webhook_secret));
  const merchantStatus = asMerchantStatus(
    data.credential_status ?? data.payup_mid_status ?? data.pg_merchant_status ?? data.merchantStatus ?? pgProfile.merchantStatus,
  );

  return {
    companyId: String(data.company_id ?? data.companyId ?? credentialCompanyId ?? requestedCompanyId),
    companyName: String(data.name ?? data.company_name ?? data.companyName ?? requestedCompanyId),
    businessNo: resolvedBusinessNo,
    businessNoNormalized: resolvedBusinessNoNormalized,
    provider,
    environment,
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
    paymentReady: payupMode
      ? Boolean(merchantId && hasSecretKey && merchantStatus === "active")
      : smsApiMode
        ? Boolean(merchantId && merchantStatus === "active")
        : Boolean(merchantId && moduleKey && merchantSerialNo && hasSecretKey && hasMerchantPassword && hasSignKey && hasWebhookSecret && merchantStatus === "active"),
  };
}

async function readFirstDocumentByIds(db: Firestore, collectionName: string, ids: string[]) {
  for (const id of ids) {
    const snapshot = await db.collection(collectionName).doc(id).get();
    if (snapshot.exists) return { id: snapshot.id, data: snapshot.data() ?? {} };
  }

  return null;
}

async function readFirstDocumentByBusinessNo(db: Firestore, collectionName: string, businessNoNormalized?: string) {
  if (!businessNoNormalized) return null;

  const fields = [
    "business_registration_number_normalized",
    "businessRegistrationNumberNormalized",
    "company_business_no_normalized",
    "companyBusinessNoNormalized",
    "seller_business_no_normalized",
    "sellerBusinessNoNormalized",
  ];

  for (const field of fields) {
    const snapshot = await db.collection(collectionName).where(field, "==", businessNoNormalized).limit(1).get();
    const document = snapshot.docs[0];
    if (document) return { id: document.id, data: document.data() ?? {} };
  }

  return null;
}

function uniqueNonEmptyStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.map((value) => optionalString(value)).filter((value): value is string => Boolean(value)))];
}

function maskMerchantId(merchantId?: string): string {
  if (!merchantId) return "MID pending";
  if (merchantId.length <= 8) return merchantId;
  return `${merchantId.slice(0, 4)}-${"*".repeat(Math.max(merchantId.length - 9, 4))}-${merchantId.slice(-4)}`;
}

function maskModuleKey(moduleKey?: string): string {
  if (!moduleKey) return "key pending";
  if (moduleKey.length <= 8) return moduleKey;
  return `${moduleKey.slice(0, 4)}-${"*".repeat(Math.max(moduleKey.length - 8, 4))}-${moduleKey.slice(-4)}`;
}

function asPaymentProviderId(value: unknown): PaymentProviderId {
  return providerIds.includes(value as PaymentProviderId) ? (value as PaymentProviderId) : "payup";
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

function normalizeBusinessNoValue(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
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
    const providerSnapshot = await db.collection("pg_provider_settings").doc("payup").get();
    const providerData = providerSnapshot.data() ?? {};
    const [infinyData, legacyData] = isLegacyInnopayEnabled()
      ? await Promise.all([
          db.collection("pg_provider_settings").doc("infiny").get().then((snapshot) => snapshot.data() ?? {}),
          db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get().then((snapshot) => snapshot.data() ?? {}),
        ])
      : [{}, {}];
    const data = { ...legacyData, ...infinyData, ...providerData };
    const provider = optionalString(data.provider ?? process.env.PG_PROVIDER ?? process.env.NEXT_PUBLIC_PG_PROVIDER);
    if (isPayupProvider(provider)) return Boolean(readPayupApiBaseUrl());

    return Boolean(optionalString(data.confirm_url ?? data.confirmUrl) || optionalString(data.api_base_url ?? data.apiBaseUrl));
  } catch {
    return false;
  }
}

async function readServerPricedItems(items: CartItemInput[]): Promise<ServerPricedItem[]> {
  return priceCartItemsFromCatalog(getAdminDb(), items);
}

function toSnapshotItem(item: ServerPricedItem) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    shipping_fee_policy: item.shippingFeePolicy ?? null,
    company_id: item.companyId,
    commerce_program_id: item.commerceProgramId ?? null,
    seller_company_id: item.sellerCompanyId ?? item.companyId,
    pg_owner_company_id: item.sellerCompanyId ?? item.companyId,
    seller_business_no: item.sellerBusinessNo ?? null,
    seller_business_no_normalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo ?? null,
    seller_company_name: item.sellerCompanyName ?? null,
    supplier_business_id: item.supplierBusinessId ?? null,
    reseller_business_id: item.resellerBusinessId ?? null,
    settlement_recipient_business_id: item.settlementRecipientBusinessId ?? null,
    partner_payout_unit_amount: item.partnerPayoutUnitAmount ?? null,
    gross_margin_unit_amount: item.grossMarginUnitAmount ?? null,
    margin_contract_version: item.marginContractVersion ?? null,
    line_amount: item.unitPrice * item.quantity,
    inventory_at_ready: item.inventory,
    reserved_inventory_at_ready: item.reservedInventory,
    available_inventory_at_ready: item.availableInventory,
    source: item.source,
  };
}

function sellerIdentityFromPricedItems(items: ServerPricedItem[]) {
  const first = items[0];

  return {
    sellerCompanyId: first?.sellerCompanyId ?? first?.companyId ?? "",
    sellerBusinessNo: first?.sellerBusinessNo,
    sellerBusinessNoNormalized: first?.sellerBusinessNoNormalized ?? first?.sellerBusinessNo,
    sellerCompanyName: first?.sellerCompanyName,
  };
}
