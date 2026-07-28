import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { hashLookupToken, makeLookupToken, readGuestShopEntryToken, readGuestShopSession, verifyGuestShopSessionAccess } from "../guestShop/session";
import { A5_CLOSED_MALL_SOURCE_SITE, a5MemberDocumentFields } from "../identity/source";
import { reserveInventorySkeleton } from "../inventory/reserveInventory";
import { createOrderSnapshotDraft } from "../orders/createOrderSnapshot";
import { makeOrderNo } from "./types";
import { validateFirestoreQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { appendAuditLogSkeleton, createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPaymentConfirmTransactionPlan } from "../utils/firestoreTransaction";
import { CatalogPricingError, priceCartItemsFromCatalog } from "./catalogPricing";
import { decryptCredential } from "./credentialCrypto";
import { confirmPaymentWithConfiguredProvider } from "./providerAdapter";
import { getPgAdapterHandoffPlan, getPgServerReadiness, isInnopaySmsApiMode, isPayupProvider } from "./providerRuntime";
import { setPgPaymentLog } from "./pgPaymentLog";
import { calculateCartShippingFee, type ShippingFeeBreakdown } from "./shippingFee";
import {
  calculateItemsAmount,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CompanyMerchantProfile,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentConfirmRequest,
  type PaymentConfirmResponse,
  type PaymentProviderId,
  type PgApproval,
  type ServerPricedItem,
} from "./types";

const allowedMerchantStatuses: CompanyMerchantProfile["merchantStatus"][] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];
const providerIds: PaymentProviderId[] = ["mock", "pg_contract", "payup", "toss", "portone", "kcp", "nice"];

function envFlagEnabled(name: string) {
  const value = String(process.env[name] ?? "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

function allowMockPaymentConfirm() {
  return envFlagEnabled("A5_ALLOW_MOCK_PAYMENT_CONFIRM") || envFlagEnabled("ALLOW_MOCK_PAYMENT_CONFIRM");
}

async function readMockApprovalActor(request: HttpRequestLike): Promise<{ companyId?: string; superAdmin: boolean } | null> {
  const token = authorizationToken(request);
  if (!token) return null;

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return null;

  const claims = decoded as Record<string, unknown>;
  const role = String(claims.role ?? "");
  const companyId = String(claims.company_id ?? "").trim();

  return {
    companyId: companyId || undefined,
    superAdmin: role === "SUPER_ADMIN" || role === "seed_admin" || claims.seed_admin === true,
  };
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

export async function paymentsConfirmHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentConfirmRequest>(request);
  let qrSessionId = String(body.qrSessionId ?? "");
  const guestShopSessionId = String(body.guestShopSessionId ?? "");
  const paymentIntentId = String(body.paymentIntentId ?? "");

  if ((!qrSessionId && !guestShopSessionId) || !paymentIntentId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_CONFIRM_INPUT_INVALID",
        message: "paymentIntentId and qrSessionId or guestShopSessionId are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  let guestShopSession: Awaited<ReturnType<typeof readGuestShopSession>> | null = null;
  let qrValidation: Awaited<ReturnType<typeof validateFirestoreQrSession>> | undefined;

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

  const requestItems = normalizeCartItems(body.items).length
    ? normalizeCartItems(body.items)
    : guestShopSession
      ? guestShopSession.items
      : normalizeCartItems(qrValidation?.session?.itemsSnapshot);

  if (requestItems.length === 0) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_CONFIRM_ITEMS_REQUIRED",
        message: "At least one cart or QR snapshot item is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const pgReadiness = getPgServerReadiness();
  const orderNo = body.orderNoCandidate ?? makeOrderNo(new Date());
  let pricedItems: ServerPricedItem[] = [];
  let recalculatedAmount = 0;
  let shippingFee: ShippingFeeBreakdown = { productSubtotal: 0, baseFee: 0, remoteAreaFee: 0, totalFee: 0, areaType: "standard" };
  let approvedAt = "";
  let approval: PgApproval | undefined;
  let merchantProfile: CompanyMerchantProfile | undefined;
  const lookupToken = makeLookupToken();
  const orderLookupUrl = buildOrderLookupUrl(request, orderNo, lookupToken);
  const customerPhoneLast4 = last4(optionalString(body.customerPhone));
  const mockApprovalActor = body.mockApprovalRequested === true ? await readMockApprovalActor(request) : null;

  try {
    const preflight = await buildConfirmPreflight({
      paymentIntentId,
      qrSessionId,
      guestShopSessionId,
      orderNo,
      requestItems,
      clientAmount: body.clientAmount,
      providerPaymentKey: optionalString(body.providerPaymentKey),
      transactionId: optionalString(body.transactionId),
      receiptUrl: optionalString(body.receiptUrl),
      payupCard: body.payupCard,
      customerName: optionalString(body.customerName),
      customerPhone: optionalString(body.customerPhone),
      deliveryMethod: body.deliveryMethod,
      receiverAddress: optionalString(body.receiverAddress),
      mockApprovalRequested: body.mockApprovalRequested === true,
      mockApprovalActorCompanyId: mockApprovalActor?.companyId,
      mockApprovalActorSuper: mockApprovalActor?.superAdmin,
      pgReadiness,
    });

    pricedItems = preflight.pricedItems;
    recalculatedAmount = preflight.recalculatedAmount;
    shippingFee = preflight.shippingFee;
    merchantProfile = preflight.merchantProfile;
    approval = preflight.approval;
    approvedAt = approval.approvedAt;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown payment confirm preflight error.";
    const [fallbackCode, fallbackDetail] = message.split(":");
    const code = error instanceof CatalogPricingError ? error.code : fallbackCode;
    const detail = error instanceof CatalogPricingError ? error.message : fallbackDetail ?? message;

    await recordPaymentConfirmFailure(paymentIntentId, orderNo, code, detail);
    sendJson(response, errorStatus(code), {
      ok: false,
      error: {
        code,
        message: errorMessage(code, detail),
        httpStatus: errorStatus(code),
      },
    });
    return;
  }

  try {
    const db = getAdminDb();
    const intentRef = db.collection("payment_intents").doc(paymentIntentId);
    const paymentRef = db.collection("payments").doc(paymentIntentId);
    const orderRef = db.collection("orders").doc(orderNo);
    const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);
    const eventRef = db.collection("payment_events").doc(`${paymentIntentId}-approved`);
    const auditRef = db.collection("audit_logs").doc();
    const commerceProgramId = pricedItems.find((item) => item.commerceProgramId)?.commerceProgramId;
    const companyNotificationRef = db.collection("company_notifications").doc(`${orderNo}-paid`);
    const integrationEventRef = db.collection("integration_events").doc(`${orderNo}-paid`);
    const kakaoOrderLookupEventRef = db.collection("kakao_order_message_events").doc(`${orderNo}-lookup-ready`);
    const productRefs = pricedItems.map((item) => (item.source === "firestore_products" ? db.collection("products").doc(item.productId) : null));

    await db.runTransaction(async (transaction) => {
      const intentSnapshot = await transaction.get(intentRef);
      const paymentSnapshot = await transaction.get(paymentRef);
      const qrSnapshot = await transaction.get(qrRef);
      const orderSnapshot = await transaction.get(orderRef);
      const productSnapshots = await Promise.all(productRefs.map((ref) => (ref ? transaction.get(ref) : Promise.resolve(null))));

      if (!intentSnapshot.exists) {
        throw new Error("PAYMENT_INTENT_NOT_FOUND");
      }

      if (paymentSnapshot.exists || orderSnapshot.exists || ["confirmed_mock", "confirmed"].includes(String(intentSnapshot.get("status") ?? ""))) {
        throw new Error("DUPLICATE_PAYMENT_ATTEMPT");
      }

      if (!qrSnapshot.exists) {
        throw new Error("QR_SESSION_NOT_FOUND");
      }

      if (!guestShopSessionId) {
        const qrStatus = String(qrSnapshot.get("status") ?? "");
        if (qrStatus !== "active") {
          throw new Error(`QR_SESSION_NOT_ACTIVE:${qrStatus}`);
        }

        const expiresAt = toIsoString(qrSnapshot.get("expires_at") ?? qrSnapshot.get("expiresAt"));
        if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
          throw new Error("QR_SESSION_EXPIRED");
        }
      }

      pricedItems = pricedItems.map((item, index) => {
        if (item.source !== "firestore_products") return item;

        const snapshot = productSnapshots[index];
        if (!snapshot?.exists) {
          throw new Error(`PRODUCT_NOT_FOUND:${requestItems[index].productId}`);
        }

        const data = snapshot.data() ?? {};
        const status = String(data.status ?? "");
        if (status !== "active" && status !== "approved") {
          throw new Error(`PRODUCT_NOT_ACTIVE:${requestItems[index].productId}`);
        }

        const inventory = asNumber(data.inventory ?? data.stock, 0);
        const reservedInventory = asNumber(data.reserved_inventory, 0);
        const availableInventory = inventory - reservedInventory;
        const quantity = requestItems[index].quantity;

        if (inventory < quantity && availableInventory < quantity) {
          throw new Error(`OUT_OF_STOCK:${requestItems[index].productId}`);
        }

        return {
          ...item,
          productName: String(data.title ?? data.name ?? requestItems[index].productName),
          unitPrice: asNumber(data.closed_mall_price ?? data.price, requestItems[index].unitPrice),
          companyId: String(data.pg_owner_company_id ?? data.pgOwnerCompanyId ?? data.seller_company_id ?? data.sellerCompanyId ?? data.company_id ?? data.companyId ?? requestItems[index].companyId),
          sellerCompanyId: String(data.seller_company_id ?? data.sellerCompanyId ?? data.company_id ?? data.companyId ?? requestItems[index].sellerCompanyId ?? requestItems[index].companyId),
          sellerBusinessNo: optionalString(
            data.seller_business_no ??
              data.sellerBusinessNo ??
              data.company_business_no ??
              data.companyBusinessNo ??
              data.business_registration_number ??
              requestItems[index].sellerBusinessNo,
          ),
          sellerBusinessNoNormalized: normalizeBusinessNoValue(
            data.seller_business_no_normalized ??
              data.sellerBusinessNoNormalized ??
              data.company_business_no_normalized ??
              data.companyBusinessNoNormalized ??
              data.business_registration_number_normalized ??
              requestItems[index].sellerBusinessNoNormalized ??
              requestItems[index].sellerBusinessNo,
          ),
          sellerCompanyName: optionalString(data.seller_company_name ?? data.sellerCompanyName ?? data.company_name ?? data.companyName ?? requestItems[index].sellerCompanyName),
          commerceProgramId: asProgramChannel(data.commerce_program_id ?? data.commerceProgramId ?? data.channel),
          pgOwnerCompanyId: optionalString(data.pg_owner_company_id ?? data.pgOwnerCompanyId),
          supplierBusinessId: optionalString(data.supplier_business_id ?? data.supplierBusinessId ?? data.product_owner_business_no),
          resellerBusinessId: optionalString(data.reseller_business_id ?? data.resellerBusinessId ?? data.selling_partner_business_no),
          settlementRecipientBusinessId: optionalString(data.settlement_recipient_business_id ?? data.settlementRecipientBusinessId ?? data.product_owner_business_no),
          partnerPayoutUnitAmount: optionalNumber(data.partner_payout_unit_amount ?? data.partnerPayoutUnitAmount ?? data.wholesale_unit_price),
          grossMarginUnitAmount: optionalNumber(data.gross_margin_unit_amount ?? data.grossMarginUnitAmount ?? data.partner_margin_unit_amount),
          marginContractVersion: optionalString(data.margin_contract_version ?? data.marginContractVersion),
          status,
          inventory,
          reservedInventory,
          availableInventory,
          source: "firestore_products" as const,
        };
      });

      const companyIds = new Set(pricedItems.map((item) => item.companyId).filter(Boolean));
      if (companyIds.size > 1) {
        throw new Error(`COMPANY_GROUP_REQUIRED:${JSON.stringify({ companyIds: [...companyIds] })}`);
      }
      const companyId = [...companyIds][0] ?? "";
      const sellerIdentity = sellerIdentityFromPricedItems(pricedItems);
      const deliveryMethod = body.deliveryMethod === "delivery" ? "delivery" : "pickup";
      const initialDeliveryStatus = deliveryMethod === "delivery" ? "invoice_pending" : "pickup_ready";
      const intentCompanyId = String(intentSnapshot.get("company_id") ?? intentSnapshot.get("companyId") ?? "");
      const merchantId = optionalString(intentSnapshot.get("merchant_id") ?? intentSnapshot.get("merchantId"));
      const merchantSerialNo = optionalString(intentSnapshot.get("merchant_serial_no") ?? intentSnapshot.get("merchantSerialNo"));
      const moduleKey = optionalString(intentSnapshot.get("pg_module_key") ?? intentSnapshot.get("moduleKey") ?? intentSnapshot.get("channelKey"));
      const terminalId = optionalString(intentSnapshot.get("terminal_id") ?? intentSnapshot.get("terminalId"));
      const merchantStatus = asMerchantStatus(intentSnapshot.get("merchant_status") ?? intentSnapshot.get("merchantStatus"));
      const merchantProvider = asPaymentProviderId(intentSnapshot.get("pg_provider") ?? intentSnapshot.get("provider") ?? "payup");

      if (intentCompanyId && intentCompanyId !== companyId) {
        throw new Error(`PAYMENT_INTENT_COMPANY_MISMATCH:${JSON.stringify({ intentCompanyId, companyId })}`);
      }

      const smsApiMode = isInnopaySmsApiMode(merchantProvider);
      const payupMode = isPayupProvider(merchantProvider);
      if (approval?.realPgCalled !== false && pgReadiness.provider !== "mock" && (!merchantId || (!payupMode && !smsApiMode && (!moduleKey || !merchantSerialNo)) || merchantStatus !== "active")) {
        throw new Error(`PAYMENT_INTENT_MID_REQUIRED:${JSON.stringify({ companyId, merchantStatus, hasModuleKey: Boolean(moduleKey), hasSerialNo: Boolean(merchantSerialNo) })}`);
      }

      merchantProfile = {
        companyId,
        companyName: String(intentSnapshot.get("company_name") ?? companyId),
        provider: merchantProvider,
        environment: intentSnapshot.get("pg_environment") === "production" ? "production" : "test",
        merchantId,
        merchantIdMasked: maskMerchantId(merchantId),
        merchantSerialNo,
        merchantSerialNoMasked: maskModuleKey(merchantSerialNo),
        moduleKey,
        moduleKeyMasked: maskModuleKey(moduleKey),
        terminalId,
        terminalIdMasked: maskModuleKey(terminalId),
        secretKeyRef: optionalString(intentSnapshot.get("secret_key_ref")),
        merchantPasswordRef: optionalString(intentSnapshot.get("merchant_password_ref")),
        signKeyRef: optionalString(intentSnapshot.get("sign_key_ref")),
        webhookSecretRef: optionalString(intentSnapshot.get("webhook_secret_ref")),
        merchantStatus,
        paymentReady: payupMode
          ? Boolean(merchantId && merchantStatus === "active")
          : smsApiMode
            ? Boolean(merchantId && optionalString(intentSnapshot.get("sign_key_ref")) && merchantStatus === "active")
            : Boolean(merchantId && moduleKey && merchantSerialNo && merchantStatus === "active"),
      };

      shippingFee = calculateCartShippingFee(pricedItems, {
        deliveryMethod,
        address: optionalString(body.receiverAddress),
      });
      recalculatedAmount = calculateItemsAmount(pricedItems) + shippingFee.totalFee;
      const amountAssertion = assertAmount(body.clientAmount ?? asNumber(intentSnapshot.get("recalculated_amount"), NaN), recalculatedAmount);

      if (!amountAssertion.ok) {
        throw new Error(`AMOUNT_MISMATCH:${JSON.stringify(amountAssertion.error.details ?? {})}`);
      }

      if (!approval) throw new Error("PAYMENT_APPROVAL_MISSING");
      approvedAt = approval.approvedAt;
      const confirmedApproval = approval;

      transaction.set(
        intentRef,
        {
          status: approval.status === "approved" ? "confirmed" : "confirmed_mock",
          confirmed_at: approvedAt,
          order_no: orderNo,
          mock_tid: approval.mockTid,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          receipt_url: approval.receiptUrl ?? null,
          real_pg_called: Boolean(approval.realPgCalled),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        paymentRef,
        {
          id: paymentIntentId,
          payment_id: paymentIntentId,
          payment_intent_id: paymentIntentId,
          order_id: orderNo,
          order_no: orderNo,
          qr_session_id: qrSessionId,
          company_id: merchantProfile!.companyId,
          seller_company_id: sellerIdentity.sellerCompanyId,
          pg_owner_company_id: merchantProfile!.companyId,
          commerce_program_id: commerceProgramId ?? null,
          seller_business_no: sellerIdentity.sellerBusinessNo ?? null,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          business_registration_number_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          seller_company_name: sellerIdentity.sellerCompanyName ?? merchantProfile!.companyName,
          pg_provider: merchantProfile!.provider,
          merchant_id: merchantProfile!.merchantId ?? null,
          merchant_id_masked: merchantProfile!.merchantIdMasked,
          merchant_serial_no: merchantProfile!.merchantSerialNo ?? null,
          merchant_serial_no_masked: merchantProfile!.merchantSerialNoMasked ?? null,
          pg_module_key: merchantProfile!.moduleKey ?? null,
          pg_module_key_masked: merchantProfile!.moduleKeyMasked,
          terminal_id: merchantProfile!.terminalId ?? null,
          terminal_id_masked: merchantProfile!.terminalIdMasked ?? null,
          secret_key_ref: merchantProfile!.secretKeyRef ?? null,
          merchant_password_ref: merchantProfile!.merchantPasswordRef ?? null,
          sign_key_ref: merchantProfile!.signKeyRef ?? null,
          webhook_secret_ref: merchantProfile!.webhookSecretRef ?? null,
          merchant_status: merchantProfile!.merchantStatus,
          status: approval.status,
          title: "새 결제 주문",
          message: `${pricedItems.length}개 상품 결제가 완료되었습니다.`,
          amount: recalculatedAmount,
          product_subtotal_amount: shippingFee.productSubtotal,
          shipping_fee: shippingFee.totalFee,
          shipping_base_fee: shippingFee.baseFee,
          shipping_remote_area_fee: shippingFee.remoteAreaFee,
          shipping_area_type: shippingFee.areaType,
          currency: "KRW",
          provider: merchantProfile!.provider,
          mock_tid: approval.mockTid,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          receipt_url: approval.receiptUrl ?? null,
          approved_at: approvedAt,
          pg_confirm_called: Boolean(approval.realPgCalled),
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: approval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
          guest_lookup_enabled: true,
          demo_read_enabled: true,
          created_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        orderRef,
        {
          id: orderNo,
          order_id: orderNo,
          orderNo,
          order_no: orderNo,
          qrSessionId,
          qr_session_id: qrSessionId,
          nurseryId: body.nurseryId ?? guestShopSession?.nurseryId ?? qrValidation?.session?.nurseryId ?? "nursery-sanho-01",
          nursery_id: body.nurseryId ?? guestShopSession?.nurseryId ?? qrValidation?.session?.nurseryId ?? "nursery-sanho-01",
          roomId: body.roomId ?? guestShopSession?.roomId ?? qrValidation?.session?.roomId ?? "room-701",
          room_id: body.roomId ?? guestShopSession?.roomId ?? qrValidation?.session?.roomId ?? "room-701",
          tabletId: body.tabletId ?? guestShopSession?.tabletId ?? qrValidation?.session?.tabletId ?? "tablet-701-a",
          tablet_id: body.tabletId ?? guestShopSession?.tabletId ?? qrValidation?.session?.tabletId ?? "tablet-701-a",
          customerName: optionalString(body.customerName) ?? "Guest",
          customer_name: optionalString(body.customerName) ?? "Guest",
          customerPhoneMasked: optionalString(body.customerPhoneMasked) ?? "010-****-0000",
          customer_phone_masked: optionalString(body.customerPhoneMasked) ?? "010-****-0000",
          customer_phone_last4: customerPhoneLast4,
          status: "paid",
          deliveryMethod,
          delivery_method: deliveryMethod,
          deliveryStatus: initialDeliveryStatus,
          delivery_status: initialDeliveryStatus,
          receiver_address: optionalString(body.receiverAddress) ?? null,
          receiver_address_detail: optionalString(body.receiverAddressDetail) ?? null,
          totalAmount: recalculatedAmount,
          total_amount: recalculatedAmount,
          product_subtotal_amount: shippingFee.productSubtotal,
          shipping_fee: shippingFee.totalFee,
          shipping_base_fee: shippingFee.baseFee,
          shipping_remote_area_fee: shippingFee.remoteAreaFee,
          shipping_area_type: shippingFee.areaType,
          paidAt: approvedAt,
          paid_at: approvedAt,
          createdAt: approvedAt,
          created_at: approvedAt,
          itemIds: pricedItems.map((_, index) => `${orderNo}-${index + 1}`),
          item_ids: pricedItems.map((_, index) => `${orderNo}-${index + 1}`),
          items_snapshot: pricedItems.map(toSnapshotItem),
          guest_shop_session_id: guestShopSessionId || null,
          guest_lookup_token_hash: hashLookupToken(lookupToken),
          guest_lookup_url: orderLookupUrl,
          customer_order_share_enabled: true,
          payment_id: paymentIntentId,
          mock_tid: approval.mockTid,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          receipt_url: approval.receiptUrl ?? null,
          company_id: merchantProfile!.companyId,
          seller_company_id: sellerIdentity.sellerCompanyId,
          pg_owner_company_id: merchantProfile!.companyId,
          commerce_program_id: commerceProgramId ?? null,
          seller_business_no: sellerIdentity.sellerBusinessNo ?? null,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          business_registration_number_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          seller_company_name: sellerIdentity.sellerCompanyName ?? merchantProfile!.companyName,
          pg_provider: merchantProfile!.provider,
          merchant_id: merchantProfile!.merchantId ?? null,
          merchant_serial_no: merchantProfile!.merchantSerialNo ?? null,
          pg_module_key: merchantProfile!.moduleKey ?? null,
          terminal_id: merchantProfile!.terminalId ?? null,
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: approval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
          guest_lookup_enabled: true,
          demo_read_enabled: true,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      pricedItems.forEach((item, index) => {
        const itemId = `${orderNo}-${index + 1}`;
        const lineAmount = item.unitPrice * item.quantity;

        transaction.set(
          db.collection("order_items").doc(itemId),
          {
            id: itemId,
            order_id: orderNo,
            order_no: orderNo,
            qr_session_id: qrSessionId,
            company_id: item.companyId,
            seller_company_id: item.sellerCompanyId ?? item.companyId,
            pg_owner_company_id: item.pgOwnerCompanyId ?? item.companyId,
            commerce_program_id: item.commerceProgramId ?? null,
            seller_business_no: item.sellerBusinessNo ?? null,
            seller_business_no_normalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo ?? null,
            business_registration_number_normalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo ?? null,
            seller_company_name: item.sellerCompanyName ?? null,
            product_id: item.productId,
            option_id: item.optionId ?? null,
            product_name: item.productName,
            option_name: item.optionName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_amount: lineAmount,
            delivery_status: initialDeliveryStatus,
            deliveryStatus: initialDeliveryStatus,
            partner_payout_unit_amount: item.partnerPayoutUnitAmount ?? null,
            settlement_amount: item.partnerPayoutUnitAmount === undefined ? lineAmount : item.partnerPayoutUnitAmount * item.quantity,
            gross_margin_unit_amount: item.grossMarginUnitAmount ?? null,
            gross_margin_amount: item.grossMarginUnitAmount === undefined ? null : item.grossMarginUnitAmount * item.quantity,
            supplier_business_id: item.supplierBusinessId ?? null,
            reseller_business_id: item.resellerBusinessId ?? null,
            settlement_recipient_business_id: item.settlementRecipientBusinessId ?? null,
            margin_contract_version: item.marginContractVersion ?? null,
            pg_provider: merchantProfile!.provider,
            settlement_owner: merchantProfile!.provider === "payup" ? "payup" : merchantProfile!.provider,
            payup_settlement_owner: merchantProfile!.provider === "payup" ? "payup" : null,
            a5_sales_commission_status: merchantProfile!.provider === "payup" ? "pending_reconciliation" : null,
            settlement_execution_blocked: true,
            ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
            source: confirmedApproval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
            guest_lookup_enabled: true,
            demo_read_enabled: true,
            created_at: approvedAt,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        if (item.commerceProgramId && item.partnerPayoutUnitAmount !== undefined) {
          const partnerPayoutAmount = item.partnerPayoutUnitAmount * item.quantity;
          const grossMarginAmount = lineAmount - partnerPayoutAmount;
          const ledgerId = orderNo + "-" + (index + 1) + "-sale";
          transaction.set(db.collection("settlement_ledger_entries").doc(ledgerId), {
            id: ledgerId,
            entry_type: "sale",
            status: "calculated",
            commerce_program_id: item.commerceProgramId,
            order_no: orderNo,
            order_item_id: itemId,
            pg_owner_company_id: item.pgOwnerCompanyId ?? item.companyId,
            supplier_business_id: item.supplierBusinessId ?? null,
            reseller_business_id: item.resellerBusinessId ?? null,
            settlement_recipient_business_id: item.settlementRecipientBusinessId ?? null,
            customer_sale_amount: lineAmount,
            partner_payout_amount: partnerPayoutAmount,
            gross_margin_amount: grossMarginAmount,
            currency: "KRW",
            contract_version: item.marginContractVersion ?? null,
            created_at: approvedAt,
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        const productRef = productRefs[index];
        if (productRef) {
          transaction.update(productRef, {
            inventory: FieldValue.increment(-item.quantity),
            reserved_inventory: FieldValue.increment(item.reservedInventory >= item.quantity ? -item.quantity : 0),
            updated_at: FieldValue.serverTimestamp(),
          });
        }

        transaction.set(
          db.collection("inventory_movements").doc(),
          {
            option_id: item.optionId ?? item.productId,
            product_id: item.productId,
            company_id: item.companyId,
            seller_company_id: item.sellerCompanyId ?? item.companyId,
            pg_owner_company_id: item.pgOwnerCompanyId ?? item.companyId,
            commerce_program_id: item.commerceProgramId ?? null,
            seller_business_no: item.sellerBusinessNo ?? null,
            seller_business_no_normalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo ?? null,
            type: "deduct",
            quantity: item.quantity,
            reason: confirmedApproval.realPgCalled ? "pg_payment_confirm" : "mock_payment_confirm",
            source_id: orderNo,
            payment_intent_id: paymentIntentId,
            ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
            source: confirmedApproval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
            demo_read_enabled: true,
            created_at: approvedAt,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

      transaction.set(
        qrRef,
        {
          status: guestShopSessionId ? String(qrSnapshot.get("status") ?? "paid") : "paid",
          payment_id: paymentIntentId,
          order_no: orderNo,
          paid_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      if (guestShopSessionId) {
        transaction.set(
          db.collection("guest_shop_sessions").doc(guestShopSessionId),
          {
            last_order_no: orderNo,
            last_paid_at: approvedAt,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      }

      transaction.set(
        eventRef,
        {
          payment_id: paymentIntentId,
          order_id: orderNo,
          order_no: orderNo,
          qr_session_id: qrSessionId,
          company_id: merchantProfile!.companyId,
          seller_company_id: sellerIdentity.sellerCompanyId,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          status: approval.status,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          amount: recalculatedAmount,
          message: approval.message,
          pg_provider: merchantProfile!.provider,
          merchant_id: merchantProfile!.merchantId ?? null,
          merchant_serial_no: merchantProfile!.merchantSerialNo ?? null,
          pg_module_key: merchantProfile!.moduleKey ?? null,
          terminal_id: merchantProfile!.terminalId ?? null,
          idempotency_key: `${paymentIntentId}-${approval.status}`,
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: approval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
          demo_read_enabled: true,
          created_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        companyNotificationRef,
        {
          id: `${orderNo}-paid`,
          company_id: merchantProfile!.companyId,
          seller_company_id: sellerIdentity.sellerCompanyId,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          order_no: orderNo,
          payment_id: paymentIntentId,
          type: "payment_paid",
          ...{
            title: "새 결제 주문",
            message: `${pricedItems.length}개 상품 결제가 완료되었습니다.`,
          },
          amount: recalculatedAmount,
          sound: true,
          read: false,
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: approval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
          demo_read_enabled: true,
          created_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        integrationEventRef,
        {
          id: `${orderNo}-paid`,
          company_id: merchantProfile!.companyId,
          seller_company_id: sellerIdentity.sellerCompanyId,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          order_no: orderNo,
          payment_id: paymentIntentId,
          event_type: "order.paid",
          platform_tracks: ["SABANGNET", "STANDARD"],
          status: "ready",
          payload_version: "a5-order-paid-v1",
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: approval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
          demo_read_enabled: true,
          created_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        kakaoOrderLookupEventRef,
        {
          id: `${orderNo}-lookup-ready`,
          company_id: merchantProfile!.companyId,
          seller_company_id: sellerIdentity.sellerCompanyId,
          seller_business_no_normalized: sellerIdentity.sellerBusinessNoNormalized ?? null,
          order_no: orderNo,
          payment_id: paymentIntentId,
          guest_shop_session_id: guestShopSessionId || null,
          event_type: "kakao.order_lookup.ready",
          channel: "kakao_channel",
          status: "ready",
          template_key: "guest_order_lookup",
          lookup_url: orderLookupUrl,
          customer_phone_last4: customerPhoneLast4,
          customer_phone_masked: optionalString(body.customerPhoneMasked) ?? null,
          raw_customer_phone_stored: false,
          privacy_scope: "order_lookup_url_without_plain_phone",
          payload: {
            order_no: orderNo,
            amount: recalculatedAmount,
            paid_at: approvedAt,
            lookup_url: orderLookupUrl,
            item_count: pricedItems.length,
          },
          ...a5MemberDocumentFields({ sourceSite: A5_CLOSED_MALL_SOURCE_SITE, memberType: "guest", created: true }),
          source: approval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
          demo_read_enabled: true,
          created_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(auditRef, {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: approval.realPgCalled ? "pg_payment_confirm" : "mock_payment_confirm",
            target: paymentIntentId,
            severity: "info",
            message: approval.realPgCalled
              ? "PG payment confirmed and order/payment/inventory snapshots written in one transaction."
              : "Mock payment confirmed and order/payment/inventory snapshots written in one transaction.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      });

      setPgPaymentLog(transaction, db, {
        id: `confirm-${paymentIntentId}`,
        functionName: "paymentsConfirm",
        step: "confirm",
        status: confirmedApproval.status,
        severity: confirmedApproval.status === "approved" ? "info" : "warning",
        provider: merchantProfile!.provider,
        companyId: merchantProfile!.companyId,
        paymentIntentId,
        qrSessionId,
        guestShopSessionId: guestShopSessionId || undefined,
        orderNo,
        transactionId: confirmedApproval.transactionId,
        paymentKey: confirmedApproval.paymentKey,
        amount: recalculatedAmount,
        message: confirmedApproval.realPgCalled
          ? "PG approval was confirmed and order/payment documents were written."
          : "Mock approval was confirmed and order/payment documents were written.",
        developerHint: "Check payments, orders, order_items, company_notifications, and inventory_movements for the same order_no.",
        technicalRefs: {
          receiptUrl: confirmedApproval.receiptUrl,
          realPgCalled: confirmedApproval.realPgCalled,
          deliveryMethod,
          itemCount: pricedItems.length,
          sellerBusinessNoNormalized: sellerIdentity.sellerBusinessNoNormalized,
        },
        createdAt: approvedAt,
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Firestore transaction error.";
    const [code, detail] = message.split(":");

    sendJson(response, errorStatus(code), {
      ok: false,
      error: {
        code,
        message: errorMessage(code, detail ?? message),
        httpStatus: errorStatus(code),
      },
    });
    return;
  }

  const inventoryPlan = reserveInventorySkeleton(pricedItems);
  const orderSnapshot = createOrderSnapshotDraft({
    orderNo,
    qrSessionId,
    nurseryId: body.nurseryId ?? guestShopSession?.nurseryId ?? qrValidation?.session?.nurseryId,
    roomId: body.roomId ?? guestShopSession?.roomId ?? qrValidation?.session?.roomId,
    tabletId: body.tabletId ?? guestShopSession?.tabletId ?? qrValidation?.session?.tabletId,
    items: pricedItems,
    totalAmount: recalculatedAmount,
    paidAt: approvedAt,
  });
  const auditPlan = appendAuditLogSkeleton(
    createAuditLogDraft({
      action: approval?.realPgCalled ? "pg_payment_confirm" : "mock_payment_confirm",
      target: paymentIntentId,
      severity: "info",
      message: approval?.realPgCalled ? "Real PG approval was called through the provider adapter." : "Mock approval only. Real PG confirm was not called.",
    }),
  );

  const result: PaymentConfirmResponse = {
    ok: true,
    provider: merchantProfile!.provider,
    pgReady: Boolean(approval?.realPgCalled || merchantProfile!.paymentReady),
    pgReadiness,
    approval: approval!,
    orderNo,
    orderLookupUrl,
    recalculatedAmount,
    merchantProfile: merchantProfile!,
    firestoreTransactionPlan: [
      ...getPaymentConfirmTransactionPlan(),
      ...getPgAdapterHandoffPlan(),
      ...inventoryPlan.transactionSteps,
      ...orderSnapshot.writePlan,
      `Append audit log at ${auditPlan.plannedPath}.`,
    ],
    message: approval!.realPgCalled
      ? "Payment confirm completed through the configured PG provider adapter."
      : "Payment confirm completed in mock mode. Real PG confirm was not called.",
  };

  sendJson(response, 200, result);
}

type ConfirmPreflightInput = {
  paymentIntentId: string;
  qrSessionId: string;
  guestShopSessionId?: string;
  orderNo: string;
  requestItems: ReturnType<typeof normalizeCartItems>;
  clientAmount?: number;
  providerPaymentKey?: string;
  transactionId?: string;
  receiptUrl?: string;
  payupCard?: PaymentConfirmRequest["payupCard"];
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  deliveryMethod?: "pickup" | "delivery";
  receiverAddress?: string;
  mockApprovalRequested?: boolean;
  mockApprovalActorCompanyId?: string;
  mockApprovalActorSuper?: boolean;
  pgReadiness: ReturnType<typeof getPgServerReadiness>;
};

type ConfirmPreflightResult = {
  pricedItems: ServerPricedItem[];
  recalculatedAmount: number;
  shippingFee: ShippingFeeBreakdown;
  merchantProfile: CompanyMerchantProfile;
  serverCredentials: PgServerCredentials;
  approval: PgApproval;
};

type PgServerCredentials = {
  secretKey?: string;
  merchantPassword?: string;
  signKey?: string;
  webhookSecret?: string;
};

async function buildConfirmPreflight(input: ConfirmPreflightInput): Promise<ConfirmPreflightResult> {
  const db = getAdminDb();
  const intentRef = db.collection("payment_intents").doc(input.paymentIntentId);
  const paymentRef = db.collection("payments").doc(input.paymentIntentId);
  const orderRef = db.collection("orders").doc(input.orderNo);
  const qrRef = db.collection("qr_payment_sessions").doc(input.qrSessionId);

  const [intentSnapshot, paymentSnapshot, orderSnapshot, qrSnapshot] = await Promise.all([
    intentRef.get(),
    paymentRef.get(),
    orderRef.get(),
    qrRef.get(),
  ]);

  if (!intentSnapshot.exists) throw new Error("PAYMENT_INTENT_NOT_FOUND");
  if (paymentSnapshot.exists || orderSnapshot.exists || ["confirmed_mock", "confirmed"].includes(String(intentSnapshot.get("status") ?? ""))) {
    throw new Error("DUPLICATE_PAYMENT_ATTEMPT");
  }
  if (!qrSnapshot.exists) throw new Error("QR_SESSION_NOT_FOUND");

  if (!input.guestShopSessionId) {
    const qrStatus = String(qrSnapshot.get("status") ?? "");
    if (qrStatus !== "active") throw new Error(`QR_SESSION_NOT_ACTIVE:${qrStatus}`);

    const expiresAt = toIsoString(qrSnapshot.get("expires_at") ?? qrSnapshot.get("expiresAt"));
    if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) throw new Error("QR_SESSION_EXPIRED");
  }

  const pricedItems = await priceCartItemsFromCatalog(db, input.requestItems);

  const companyIds = new Set(pricedItems.map((item) => item.companyId).filter(Boolean));
  if (companyIds.size > 1) {
    throw new Error(`COMPANY_GROUP_REQUIRED:${JSON.stringify({ companyIds: [...companyIds] })}`);
  }

  const companyId = [...companyIds][0] ?? "";
  const commerceProgramId = asProgramChannel(intentSnapshot.get("commerce_program_id") ?? intentSnapshot.get("commerceProgramId"));
  const pricedProgramIds = new Set(pricedItems.map((item) => item.commerceProgramId).filter(Boolean));
  if (pricedProgramIds.size > 1 || (commerceProgramId && !pricedProgramIds.has(commerceProgramId))) {
    throw new Error("PAYMENT_INTENT_PROGRAM_MISMATCH");
  }
  const intentCompanyId = String(intentSnapshot.get("company_id") ?? intentSnapshot.get("companyId") ?? "");
  if (intentCompanyId && intentCompanyId !== companyId) {
    throw new Error(`PAYMENT_INTENT_COMPANY_MISMATCH:${JSON.stringify({ intentCompanyId, companyId })}`);
  }

  const merchantId = optionalString(intentSnapshot.get("merchant_id") ?? intentSnapshot.get("merchantId"));
  const merchantSerialNo = optionalString(intentSnapshot.get("merchant_serial_no") ?? intentSnapshot.get("merchantSerialNo"));
  const moduleKey = optionalString(intentSnapshot.get("pg_module_key") ?? intentSnapshot.get("moduleKey") ?? intentSnapshot.get("channelKey"));
  const terminalId = optionalString(intentSnapshot.get("terminal_id") ?? intentSnapshot.get("terminalId"));
  const merchantStatus = asMerchantStatus(intentSnapshot.get("merchant_status") ?? intentSnapshot.get("merchantStatus"));
  const merchantProvider = asPaymentProviderId(intentSnapshot.get("pg_provider") ?? intentSnapshot.get("provider") ?? "payup");
  const merchantProfile: CompanyMerchantProfile = {
    companyId,
    companyName: String(intentSnapshot.get("company_name") ?? companyId),
    provider: merchantProvider,
    environment: intentSnapshot.get("pg_environment") === "production" ? "production" : "test",
    merchantId,
    merchantIdMasked: maskMerchantId(merchantId),
    merchantSerialNo,
    merchantSerialNoMasked: maskModuleKey(merchantSerialNo),
    moduleKey,
    moduleKeyMasked: maskModuleKey(moduleKey),
    terminalId,
    terminalIdMasked: maskModuleKey(terminalId),
    secretKeyRef: optionalString(intentSnapshot.get("secret_key_ref")),
    merchantPasswordRef: optionalString(intentSnapshot.get("merchant_password_ref")),
    signKeyRef: optionalString(intentSnapshot.get("sign_key_ref")),
    webhookSecretRef: optionalString(intentSnapshot.get("webhook_secret_ref")),
    merchantStatus,
    paymentReady: isPayupProvider(merchantProvider)
      ? Boolean(merchantId && merchantStatus === "active")
      : isInnopaySmsApiMode(merchantProvider)
        ? Boolean(merchantId && optionalString(intentSnapshot.get("sign_key_ref")) && merchantStatus === "active")
        : Boolean(merchantId && moduleKey && merchantSerialNo && merchantStatus === "active"),
  };

  const smsApiMode = isInnopaySmsApiMode(merchantProvider);
  const payupMode = isPayupProvider(merchantProvider);
  const shippingFee = calculateCartShippingFee(pricedItems, {
    deliveryMethod: input.deliveryMethod,
    address: input.receiverAddress,
  });
  const recalculatedAmount = calculateItemsAmount(pricedItems) + shippingFee.totalFee;
  const amountAssertion = assertAmount(input.clientAmount ?? asNumber(intentSnapshot.get("recalculated_amount"), NaN), recalculatedAmount);
  if (!amountAssertion.ok) {
    throw new Error(`AMOUNT_MISMATCH:${JSON.stringify(amountAssertion.error.details ?? {})}`);
  }

  const mockApprovalAllowed = allowMockPaymentConfirm();

  if (
    !mockApprovalAllowed &&
    input.pgReadiness.provider !== "mock" &&
    (!merchantId || (!payupMode && !smsApiMode && (!moduleKey || !merchantSerialNo)) || merchantStatus !== "active")
  ) {
    throw new Error(`PAYMENT_INTENT_MID_REQUIRED:${JSON.stringify({ companyId, merchantStatus, hasModuleKey: Boolean(moduleKey), hasSerialNo: Boolean(merchantSerialNo) })}`);
  }

  if (input.mockApprovalRequested && !mockApprovalAllowed) {
    throw new Error("PAYMENT_MOCK_APPROVAL_DISABLED:Mock payment approval requires A5_ALLOW_MOCK_PAYMENT_CONFIRM=true.");
  }

  if (input.mockApprovalRequested && input.pgReadiness.environment === "production") {
    throw new Error("PAYMENT_DEMO_APPROVAL_DISABLED:Demo payment approval is disabled in production.");
  }

  if (merchantProfile.provider === "mock" && !mockApprovalAllowed) {
    throw new Error("PAYMENT_MOCK_APPROVAL_DISABLED:Mock payment provider requires A5_ALLOW_MOCK_PAYMENT_CONFIRM=true.");
  }

  const credentialSnapshot = commerceProgramId
    ? await db.collection("program_pg_credentials").doc(commerceProgramId).get()
    : await db.collection("company_pg_credentials").doc(companyId).get();
  const credentialData = credentialSnapshot.data() ?? {};
  const credentialEnvironment = credentialData.environment === "production" ? "production" : "test";
  if (credentialSnapshot.exists && credentialEnvironment !== merchantProfile.environment) {
    throw new Error(`PAYMENT_PG_ENVIRONMENT_CHANGED:${merchantProfile.environment}->${credentialEnvironment}`);
  }
  const serverCredentials: PgServerCredentials = readServerCredentials(credentialData);

  await db.runTransaction(async (transaction) => {
    const currentIntent = await transaction.get(intentRef);
    const currentPayment = await transaction.get(paymentRef);
    const currentOrder = await transaction.get(orderRef);
    const status = String(currentIntent.get("status") ?? "");

    if (currentPayment.exists || currentOrder.exists || ["confirming", "confirmed", "confirmed_mock"].includes(status)) {
      throw new Error("DUPLICATE_PAYMENT_ATTEMPT");
    }

    transaction.set(
      intentRef,
      {
        status: "confirming",
        confirming_at: new Date().toISOString(),
        order_no: input.orderNo,
        idempotency_key: input.paymentIntentId,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  if (input.mockApprovalRequested) {
    return {
      pricedItems,
      recalculatedAmount,
      shippingFee,
      merchantProfile,
      serverCredentials,
      approval: createDemoApproval(input.orderNo, merchantProfile.provider),
    };
  }

  const providerResult = await confirmPaymentWithConfiguredProvider({
    paymentIntentId: input.paymentIntentId,
    orderNo: input.orderNo,
    amount: recalculatedAmount,
    provider: merchantProfile.provider,
    environment: merchantProfile.environment,
    companyId,
    merchantId,
    merchantSerialNo,
    moduleKey,
    terminalId,
    secretKey: serverCredentials.secretKey,
    merchantPassword: serverCredentials.merchantPassword,
    signKey: serverCredentials.signKey,
    itemName: checkoutItemName(pricedItems),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    customerEmail: input.customerEmail,
    payupCard: input.payupCard,
    secretKeyRef: merchantProfile.secretKeyRef,
    merchantPasswordRef: merchantProfile.merchantPasswordRef,
    signKeyRef: merchantProfile.signKeyRef,
    providerPaymentKey: input.providerPaymentKey,
    transactionId: input.transactionId,
    receiptUrl: input.receiptUrl,
  });

  if (!providerResult.ok) {
    throw new Error(`${providerResult.code}:${providerResult.message}`);
  }

  if (providerResult.approval.status === "approved_mock" && !mockApprovalAllowed) {
    throw new Error("PAYMENT_MOCK_APPROVAL_DISABLED:Mock payment approval requires A5_ALLOW_MOCK_PAYMENT_CONFIRM=true or a preserved test company token.");
  }

  return {
    pricedItems,
    recalculatedAmount,
    shippingFee,
    merchantProfile,
    serverCredentials,
    approval: providerResult.approval,
  };
}

function createDemoApproval(orderNo: string, provider: PaymentProviderId): PgApproval {
  return {
    provider,
    status: "approved_mock",
    mockTid: `DEMO-FN-${orderNo}`,
    realPgCalled: false,
    approvedAt: new Date().toISOString(),
    message: "Demo payment approval completed. No real PG API was called.",
  };
}

function checkoutItemName(items: ServerPricedItem[]): string {
  const first = items[0]?.productName || "A5 order";
  return items.length > 1 ? `${first} plus ${items.length - 1}` : first;
}

function readServerCredentials(data: Record<string, unknown>): PgServerCredentials {
  return {
    secretKey: decryptCredential(data.encrypted_secret_key) ?? decryptCredential(data.encrypted_auth_key),
    merchantPassword: decryptCredential(data.encrypted_merchant_password),
    signKey: decryptCredential(data.encrypted_sign_key),
    webhookSecret: decryptCredential(data.encrypted_webhook_secret),
  };
}

async function recordPaymentConfirmFailure(paymentIntentId: string, orderNo: string, code: string, message: string) {
  try {
    const db = getAdminDb();
    const now = new Date().toISOString();

    await db.runTransaction(async (transaction) => {
      transaction.set(
        db.collection("payment_intents").doc(paymentIntentId),
        {
          status: "failed",
          failed_at: now,
          failure_code: code,
          failure_message: message,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        db.collection("payment_events").doc(`${paymentIntentId}-failed-${Date.now()}`),
        {
          payment_intent_id: paymentIntentId,
          order_no: orderNo,
          event_type: "confirm_failed",
          status: "failed",
          error_code: code,
          error_message: message,
          source: "firebase_functions_pg_confirm",
          created_at: now,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      setPgPaymentLog(transaction, db, {
        id: `confirm-failed-${paymentIntentId}-${Date.now()}`,
        functionName: "paymentsConfirm",
        step: "confirm_failed",
        status: "failed",
        severity: "error",
        paymentIntentId,
        orderNo,
        message,
        developerHint: "Check payment_intents failure_code/failure_message and retry only after fixing the blocker.",
        technicalRefs: {
          errorCode: code,
        },
        createdAt: now,
      });
    });
  } catch {
    // Best-effort failure audit only. The response still carries the original payment error.
  }
}

function toSnapshotItem(item: ServerPricedItem) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    shipping_fee_policy: item.shippingFeePolicy ?? null,
    line_amount: item.unitPrice * item.quantity,
    company_id: item.companyId,
    seller_company_id: item.sellerCompanyId ?? item.companyId,
    pg_owner_company_id: item.sellerCompanyId ?? item.companyId,
    seller_business_no: item.sellerBusinessNo ?? null,
    seller_business_no_normalized: item.sellerBusinessNoNormalized ?? item.sellerBusinessNo ?? null,
    seller_company_name: item.sellerCompanyName ?? null,
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

function normalizeBusinessNoValue(value: unknown): string | undefined {
  const text = String(value ?? "").replace(/[^0-9]/g, "");
  return text ? text : undefined;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString();
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return undefined;
}

function errorStatus(code: string): number {
  if (code === "DUPLICATE_PAYMENT_ATTEMPT") return 409;
  if (code === "QR_SESSION_NOT_ACTIVE" || code === "QR_SESSION_EXPIRED") return 409;
  if (code === "GUEST_SHOP_SESSION_EXPIRED") return 409;
  if (code === "OUT_OF_STOCK" || code === "INVENTORY_SHORTAGE") return 409;
  if (code === "PRODUCT_COMPANY_MISSING" || code === "PRODUCT_COMPANY_MISMATCH") return 409;
  if (code === "AMOUNT_MISMATCH") return 409;
  if (code === "COMPANY_GROUP_REQUIRED") return 409;
  if (code === "PAYMENT_INTENT_COMPANY_MISMATCH") return 409;
  if (code === "PAYMENT_INTENT_MID_REQUIRED") return 409;
  if (code === "PAYMENT_MOCK_APPROVAL_DISABLED") return 409;
  if (code === "PAYMENT_DEMO_APPROVAL_DISABLED") return 409;
  if (code === "PAYMENT_APPROVAL_MISSING") return 503;
  if (code === "PAYUP_TRANSACTION_ID_MISSING") return 409;
  if (code === "PG_PROVIDER_ADAPTER_NOT_IMPLEMENTED") return 503;
  if (code.endsWith("NOT_FOUND")) return 404;
  return 503;
}

function errorMessage(code: string, detail: string): string {
  const messages: Record<string, string> = {
    PAYMENT_INTENT_NOT_FOUND: "Payment intent was not found. Call /payments/ready first.",
    DUPLICATE_PAYMENT_ATTEMPT: "Duplicate payment attempt blocked.",
    QR_SESSION_NOT_FOUND: "QR session was not found.",
    QR_SESSION_NOT_ACTIVE: `QR session is not active: ${detail}.`,
    QR_SESSION_EXPIRED: "QR session is expired.",
    PRODUCT_NOT_FOUND: `Product was not found: ${detail}.`,
    PRODUCT_NOT_ACTIVE: `Product is not active: ${detail}.`,
    OPTION_NOT_FOUND: `Product option was not found: ${detail}.`,
    PRODUCT_COMPANY_MISSING: `Product seller company is missing: ${detail}.`,
    PRODUCT_COMPANY_MISMATCH: `Product seller company identity is invalid: ${detail}.`,
    OUT_OF_STOCK: `Product is out of stock: ${detail}.`,
    INVENTORY_SHORTAGE: `Product is out of stock: ${detail}.`,
    AMOUNT_MISMATCH: "Client amount does not match server recalculated amount.",
    COMPANY_GROUP_REQUIRED: "One payment QR can contain items from only one company/MID. Create the next company QR after this payment.",
    PAYMENT_INTENT_COMPANY_MISMATCH: "Payment intent company does not match the recalculated cart company.",
    PAYMENT_INTENT_MID_REQUIRED: "Company MID, serial number, payment module key, or active status is missing for real PG confirm.",
    PAYMENT_MOCK_APPROVAL_DISABLED: "Mock payment approval is disabled. Enable A5_ALLOW_MOCK_PAYMENT_CONFIRM only for controlled development tests.",
    PAYMENT_DEMO_APPROVAL_DISABLED: "Demo payment approval is disabled in production.",
    PAYMENT_APPROVAL_MISSING: "Payment approval result is missing after PG confirm.",
    PAYUP_TRANSACTION_ID_MISSING: "PayUp \uacb0\uc81c \uc778\uc99d \uac70\ub798\ubc88\ud638\uac00 \uc5c6\uc2b5\ub2c8\ub2e4. \uacb0\uc81c \uc2b9\uc778\uacfc \uce74\ub4dc \uacfc\uae08\uc740 \uc694\uccad\ub418\uc9c0 \uc54a\uc558\uc2b5\ub2c8\ub2e4.",
    PG_PROVIDER_ADAPTER_NOT_IMPLEMENTED: "Configured PG adapter is not ready for real approval. Check Payup merchant credentials and Firebase Function secrets.",
  };

  return messages[code] ?? detail;
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

function last4(value: string | undefined): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

function buildOrderLookupUrl(request: HttpRequestLike, orderNo: string, token: string): string {
  const configuredBase = (process.env.NEXT_PUBLIC_A5_PUBLIC_BASE_URL || process.env.A5_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  const origin = request.get?.("origin")?.replace(/\/$/, "") ?? "";
  const base = configuredBase || origin || "https://a5-closed-mall.pages.dev";
  const params = new URLSearchParams({ orderNo, token });
  return `${base}/orders/guest/live?${params.toString()}`;
}

function asProgramChannel(value: unknown): "a5s" | "a5ws" | "a5ls" | undefined {
  return value === "a5s" || value === "a5ws" || value === "a5ls" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
}
