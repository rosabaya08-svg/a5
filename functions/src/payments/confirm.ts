import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { reserveInventorySkeleton } from "../inventory/reserveInventory";
import { createOrderSnapshotDraft } from "../orders/createOrderSnapshot";
import { makeOrderNo } from "./types";
import { validateFirestoreQrSession } from "../qr/validateQrSession";
import { assertAmount } from "../utils/assertAmount";
import { appendAuditLogSkeleton, createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPaymentConfirmTransactionPlan } from "../utils/firestoreTransaction";
import { confirmPaymentWithConfiguredProvider } from "./providerAdapter";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
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

const INFINY_TOTAL_FEE_RATE = 7;
const allowedMerchantStatuses: CompanyMerchantProfile["merchantStatus"][] = ["not_applied", "in_review", "mid_issued", "active", "blocked"];
const providerIds: PaymentProviderId[] = ["mock", "pg_contract", "infiny", "toss", "portone", "kcp", "nice"];

function calculateInfinySettlementAmount(lineAmount: number) {
  return Math.max(lineAmount - Math.round(lineAmount * (INFINY_TOTAL_FEE_RATE / 100)), 0);
}

export async function paymentsConfirmHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentConfirmRequest>(request);
  const qrSessionId = String(body.qrSessionId ?? "");
  const paymentIntentId = String(body.paymentIntentId ?? "");

  if (!qrSessionId || !paymentIntentId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_CONFIRM_INPUT_INVALID",
        message: "paymentIntentId and qrSessionId are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const qrValidation = await validateFirestoreQrSession(qrSessionId);
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

  const requestItems = normalizeCartItems(body.items).length
    ? normalizeCartItems(body.items)
    : normalizeCartItems(qrValidation.session?.itemsSnapshot);

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
  let approvedAt = "";
  let approval: PgApproval | undefined;
  let merchantProfile: CompanyMerchantProfile | undefined;

  try {
    const db = getAdminDb();
    const intentRef = db.collection("payment_intents").doc(paymentIntentId);
    const paymentRef = db.collection("payments").doc(paymentIntentId);
    const orderRef = db.collection("orders").doc(orderNo);
    const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);
    const eventRef = db.collection("payment_events").doc(`${paymentIntentId}-approved`);
    const auditRef = db.collection("audit_logs").doc();
    const productRefs = requestItems.map((item) => db.collection("products").doc(item.productId));

    await db.runTransaction(async (transaction) => {
      const intentSnapshot = await transaction.get(intentRef);
      const paymentSnapshot = await transaction.get(paymentRef);
      const qrSnapshot = await transaction.get(qrRef);
      const orderSnapshot = await transaction.get(orderRef);
      const productSnapshots = await Promise.all(productRefs.map((ref) => transaction.get(ref)));

      if (!intentSnapshot.exists) {
        throw new Error("PAYMENT_INTENT_NOT_FOUND");
      }

      if (paymentSnapshot.exists || orderSnapshot.exists || ["confirmed_mock", "confirmed"].includes(String(intentSnapshot.get("status") ?? ""))) {
        throw new Error("DUPLICATE_PAYMENT_ATTEMPT");
      }

      if (!qrSnapshot.exists) {
        throw new Error("QR_SESSION_NOT_FOUND");
      }

      const qrStatus = String(qrSnapshot.get("status") ?? "");
      if (qrStatus !== "active") {
        throw new Error(`QR_SESSION_NOT_ACTIVE:${qrStatus}`);
      }

      const expiresAt = toIsoString(qrSnapshot.get("expires_at") ?? qrSnapshot.get("expiresAt"));
      if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) {
        throw new Error("QR_SESSION_EXPIRED");
      }

      pricedItems = productSnapshots.map((snapshot, index) => {
        if (!snapshot.exists) {
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
          ...requestItems[index],
          productName: String(data.title ?? data.name ?? requestItems[index].productName),
          unitPrice: asNumber(data.closed_mall_price ?? data.price, requestItems[index].unitPrice),
          companyId: String(data.company_id ?? requestItems[index].companyId),
          status,
          inventory,
          reservedInventory,
          availableInventory,
          source: "firestore_products",
        };
      });

      const companyIds = new Set(pricedItems.map((item) => item.companyId).filter(Boolean));
      if (companyIds.size > 1) {
        throw new Error(`COMPANY_GROUP_REQUIRED:${JSON.stringify({ companyIds: [...companyIds] })}`);
      }
      const companyId = [...companyIds][0] ?? "";
      const intentCompanyId = String(intentSnapshot.get("company_id") ?? intentSnapshot.get("companyId") ?? "");
      const merchantId = optionalString(intentSnapshot.get("merchant_id") ?? intentSnapshot.get("merchantId"));
      const moduleKey = optionalString(intentSnapshot.get("pg_module_key") ?? intentSnapshot.get("moduleKey") ?? intentSnapshot.get("channelKey"));
      const merchantStatus = asMerchantStatus(intentSnapshot.get("merchant_status") ?? intentSnapshot.get("merchantStatus"));
      const merchantProvider = asPaymentProviderId(intentSnapshot.get("pg_provider") ?? intentSnapshot.get("provider") ?? "infiny");

      if (intentCompanyId && intentCompanyId !== companyId) {
        throw new Error(`PAYMENT_INTENT_COMPANY_MISMATCH:${JSON.stringify({ intentCompanyId, companyId })}`);
      }

      if (pgReadiness.provider !== "mock" && (!merchantId || !moduleKey || merchantStatus !== "active")) {
        throw new Error(`PAYMENT_INTENT_MID_REQUIRED:${JSON.stringify({ companyId, merchantStatus, hasModuleKey: Boolean(moduleKey) })}`);
      }

      merchantProfile = {
        companyId,
        companyName: String(intentSnapshot.get("company_name") ?? companyId),
        provider: merchantProvider,
        merchantId,
        merchantIdMasked: maskMerchantId(merchantId),
        moduleKey,
        moduleKeyMasked: maskModuleKey(moduleKey),
        merchantStatus,
        paymentReady: Boolean(merchantId && moduleKey && merchantStatus === "active"),
      };

      recalculatedAmount = calculateItemsAmount(pricedItems);
      const amountAssertion = assertAmount(body.clientAmount ?? asNumber(intentSnapshot.get("recalculated_amount"), NaN), recalculatedAmount);

      if (!amountAssertion.ok) {
        throw new Error(`AMOUNT_MISMATCH:${JSON.stringify(amountAssertion.error.details ?? {})}`);
      }

      const providerResult = await confirmPaymentWithConfiguredProvider({
        paymentIntentId,
        orderNo,
        amount: recalculatedAmount,
        companyId,
        merchantId,
        moduleKey,
        providerPaymentKey: optionalString(body.providerPaymentKey),
        transactionId: optionalString(body.transactionId),
        receiptUrl: optionalString(body.receiptUrl),
      });

      if (!providerResult.ok) {
        throw new Error(providerResult.code);
      }

      approval = providerResult.approval;
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
          pg_provider: merchantProfile!.provider,
          merchant_id: merchantProfile!.merchantId ?? null,
          merchant_id_masked: merchantProfile!.merchantIdMasked,
          pg_module_key: merchantProfile!.moduleKey ?? null,
          pg_module_key_masked: merchantProfile!.moduleKeyMasked,
          merchant_status: merchantProfile!.merchantStatus,
          status: approval.status,
          amount: recalculatedAmount,
          currency: "KRW",
          provider: merchantProfile!.provider,
          mock_tid: approval.mockTid,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          receipt_url: approval.receiptUrl ?? null,
          approved_at: approvedAt,
          pg_confirm_called: Boolean(approval.realPgCalled),
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
          nurseryId: body.nurseryId ?? qrValidation.session?.nurseryId ?? "nursery-sanho-01",
          nursery_id: body.nurseryId ?? qrValidation.session?.nurseryId ?? "nursery-sanho-01",
          roomId: body.roomId ?? qrValidation.session?.roomId ?? "room-701",
          room_id: body.roomId ?? qrValidation.session?.roomId ?? "room-701",
          tabletId: body.tabletId ?? qrValidation.session?.tabletId ?? "tablet-701-a",
          tablet_id: body.tabletId ?? qrValidation.session?.tabletId ?? "tablet-701-a",
          customerName: optionalString(body.customerName) ?? "Guest",
          customer_name: optionalString(body.customerName) ?? "Guest",
          customerPhoneMasked: optionalString(body.customerPhoneMasked) ?? "010-****-0000",
          customer_phone_masked: optionalString(body.customerPhoneMasked) ?? "010-****-0000",
          status: "paid",
          deliveryMethod: body.deliveryMethod === "delivery" ? "delivery" : "pickup",
          delivery_method: body.deliveryMethod === "delivery" ? "delivery" : "pickup",
          receiver_address: optionalString(body.receiverAddress) ?? null,
          receiver_address_detail: optionalString(body.receiverAddressDetail) ?? null,
          totalAmount: recalculatedAmount,
          total_amount: recalculatedAmount,
          paidAt: approvedAt,
          paid_at: approvedAt,
          createdAt: approvedAt,
          created_at: approvedAt,
          itemIds: pricedItems.map((_, index) => `${orderNo}-${index + 1}`),
          item_ids: pricedItems.map((_, index) => `${orderNo}-${index + 1}`),
          items_snapshot: pricedItems.map(toSnapshotItem),
          payment_id: paymentIntentId,
          mock_tid: approval.mockTid,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          receipt_url: approval.receiptUrl ?? null,
          company_id: merchantProfile!.companyId,
          pg_provider: merchantProfile!.provider,
          merchant_id: merchantProfile!.merchantId ?? null,
          pg_module_key: merchantProfile!.moduleKey ?? null,
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
            product_id: item.productId,
            option_id: item.optionId ?? null,
            product_name: item.productName,
            option_name: item.optionName,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            line_amount: lineAmount,
            delivery_status: "pickup_ready",
            settlement_amount: calculateInfinySettlementAmount(lineAmount),
            pg_provider: "infiny",
            settlement_owner: "infiny",
            settlement_execution_blocked: true,
            source: confirmedApproval.realPgCalled ? "firebase_functions_pg_confirm" : "firebase_functions_mock_confirm",
            guest_lookup_enabled: true,
            demo_read_enabled: true,
            created_at: approvedAt,
            updated_at: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );

        transaction.update(productRefs[index], {
          inventory: FieldValue.increment(-item.quantity),
          reserved_inventory: FieldValue.increment(item.reservedInventory >= item.quantity ? -item.quantity : 0),
          updated_at: FieldValue.serverTimestamp(),
        });

        transaction.set(
          db.collection("inventory_movements").doc(),
          {
            option_id: item.optionId ?? item.productId,
            product_id: item.productId,
            company_id: item.companyId,
            type: "deduct",
            quantity: item.quantity,
            reason: confirmedApproval.realPgCalled ? "pg_payment_confirm" : "mock_payment_confirm",
            source_id: orderNo,
            payment_intent_id: paymentIntentId,
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
          status: "paid",
          payment_id: paymentIntentId,
          order_no: orderNo,
          paid_at: approvedAt,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      transaction.set(
        eventRef,
        {
          payment_id: paymentIntentId,
          order_id: orderNo,
          order_no: orderNo,
          qr_session_id: qrSessionId,
          company_id: merchantProfile!.companyId,
          status: approval.status,
          provider_payment_key: approval.paymentKey ?? null,
          provider_transaction_id: approval.transactionId ?? null,
          amount: recalculatedAmount,
          message: approval.message,
          pg_provider: merchantProfile!.provider,
          merchant_id: merchantProfile!.merchantId ?? null,
          pg_module_key: merchantProfile!.moduleKey ?? null,
          idempotency_key: `${paymentIntentId}-${approval.status}`,
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
    nurseryId: body.nurseryId ?? qrValidation.session?.nurseryId,
    roomId: body.roomId ?? qrValidation.session?.roomId,
    tabletId: body.tabletId ?? qrValidation.session?.tabletId,
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
    pgReady: pgReadiness.readyForAdapter,
    pgReadiness,
    approval: approval!,
    orderNo,
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

function toSnapshotItem(item: ServerPricedItem) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_amount: item.unitPrice * item.quantity,
    company_id: item.companyId,
    source: item.source,
  };
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
  if (code === "OUT_OF_STOCK") return 409;
  if (code === "AMOUNT_MISMATCH") return 409;
  if (code === "COMPANY_GROUP_REQUIRED") return 409;
  if (code === "PAYMENT_INTENT_COMPANY_MISMATCH") return 409;
  if (code === "PAYMENT_INTENT_MID_REQUIRED") return 409;
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
    OUT_OF_STOCK: `Product is out of stock: ${detail}.`,
    AMOUNT_MISMATCH: "Client amount does not match server recalculated amount.",
    COMPANY_GROUP_REQUIRED: "One payment QR can contain items from only one company/MID. Create the next company QR after this payment.",
    PAYMENT_INTENT_COMPANY_MISMATCH: "Payment intent company does not match the recalculated cart company.",
    PAYMENT_INTENT_MID_REQUIRED: "Company MID or payment module key is missing or not active for real PG confirm.",
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
