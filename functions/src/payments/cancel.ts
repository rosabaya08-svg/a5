import { releaseInventorySkeleton } from "../inventory/releaseInventory";
import { appendAuditLogSkeleton, createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPgAdapterHandoffPlan, getPgServerReadiness, isPayupProvider } from "./providerRuntime";
import { cancelProviderPayment } from "./providerAdapter";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { decryptCredential } from "./credentialCrypto";
import {
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type PaymentCancelRequest,
} from "./types";

export async function paymentsCancelHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentCancelRequest & { items?: unknown }>(request);
  const orderNo = String(body.orderNo ?? "");

  if (!orderNo) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "PAYMENT_CANCEL_INPUT_INVALID",
        message: "orderNo is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const pgReadiness = getPgServerReadiness();
  const db = getAdminDb();
  const requestedBy = normalizeCancelRequester(body.requestedBy);
  const requestedCompanyId = text(body.companyId);
  const paymentSnapshot = (
    await db.collection("payments").where("order_no", "==", orderNo).limit(1).get()
  ).docs[0];
  const paymentData = paymentSnapshot?.data() ?? {};
  const orderSnapshot = await db.collection("orders").doc(orderNo).get();
  const orderData = orderSnapshot.data() ?? {};
  const paymentKey = String(body.paymentKey ?? paymentData.provider_payment_key ?? paymentData.provider_transaction_id ?? paymentData.paymentKey ?? "");
  const paymentTotalAmount = Number(paymentData.amount ?? orderData.total_amount ?? orderData.totalAmount ?? 0);
  const cancelAmount = Number(body.amount ?? paymentTotalAmount ?? 0);
  const companyId = text(paymentData.company_id ?? paymentData.companyId ?? orderData.company_id ?? orderData.companyId);

  const privilegedActor = await verifyPrivilegedCancelActor(request, requestedBy, companyId, requestedCompanyId);
  if (!privilegedActor.ok) {
    sendJson(response, privilegedActor.httpStatus, {
      ok: false,
      error: {
        code: privilegedActor.code,
        message: privilegedActor.message,
        httpStatus: privilegedActor.httpStatus,
      },
    });
    return;
  }

  const commerceProgramId = text(paymentData.commerce_program_id ?? orderData.commerce_program_id);
  const credentialSnapshot = commerceProgramId
    ? await db.collection("program_pg_credentials").doc(commerceProgramId).get()
    : companyId
      ? await db.collection("company_pg_credentials").doc(companyId).get()
      : undefined;
  const credentialData = credentialSnapshot?.data() ?? {};
  const secretKey = decryptCredential(credentialData.encrypted_secret_key) ?? decryptCredential(credentialData.encrypted_auth_key);
  const cancelPwd = decryptCredential(credentialData.encrypted_merchant_password);
  const provider = String(paymentData.pg_provider ?? paymentData.provider ?? orderData.pg_provider ?? credentialData.pg_provider ?? pgReadiness.provider ?? "");
  const environment = credentialData.environment === "production" ? "production" : "test";
  const payupMode = isPayupProvider(provider);
  const merchantId = String(
    paymentData.merchant_id ??
      orderData.merchant_id ??
      credentialData.payup_mid ??
      credentialData.mid ??
      credentialData.merchant_id ??
      "",
  );
  const cancelItems = normalizeCartItems(body.items);
  const customerGuestRequest = requestedBy === "CUSTOMER_GUEST";
  const companyAdminRequest = requestedBy === "COMPANY_ADMIN";
  const payupApiKeyReady = Boolean(secretKey || process.env.PAYUP_API_KEY || process.env.PAYUP_API_CERT_KEY || process.env.PG_SECRET_KEY);
  const providerCancelReady = payupMode
    ? Boolean(merchantId && paymentKey && cancelAmount > 0 && payupApiKeyReady)
    : Boolean(pgReadiness.readyForAdapter && paymentKey && (secretKey || cancelPwd));
  const canCallProviderCancel = requestedBy === "SUPER_ADMIN" && providerCancelReady;
  const providerResult = canCallProviderCancel
    ? await cancelProviderPayment({
        orderNo,
        provider,
        environment,
        paymentKey,
        amount: cancelAmount,
        totalAmount: paymentTotalAmount,
        reason: body.reason ?? "No reason supplied",
        merchantId,
        cancelPwd,
        secretKey,
      })
    : undefined;
  const releasePlan = releaseInventorySkeleton(cancelItems);
  const auditPlan = appendAuditLogSkeleton(
    createAuditLogDraft({
      action: "payment_cancel_blocked",
      target: orderNo,
      severity: "blocked",
      message: "Real PG cancel/refund is blocked until PG and settlement policy approval.",
    }),
  );

  const cancelRequestId = `${orderNo}-${Date.now()}`;

  const orderItemSnapshot = providerResult?.ok
    ? await db.collection("order_items").where("order_no", "==", orderNo).get()
    : undefined;

  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("cancel_requests").doc(cancelRequestId), {
      order_no: orderNo,
      payment_id: paymentData.payment_id ?? paymentData.payment_intent_id ?? paymentSnapshot?.id ?? null,
      company_id: paymentData.company_id ?? orderData.company_id ?? null,
      commerce_program_id: commerceProgramId || null,
      companyId: paymentData.companyId ?? orderData.companyId ?? paymentData.company_id ?? orderData.company_id ?? null,
      requested_company_id: requestedCompanyId || null,
      nursery_id: orderData.nursery_id ?? paymentData.nursery_id ?? null,
      room_id: orderData.room_id ?? null,
      tablet_id: orderData.tablet_id ?? null,
      payment_key: paymentKey || null,
      amount: cancelAmount || null,
      reason: body.reason ?? "No reason supplied",
      items: cancelItems,
      requested_by: requestedBy,
      actor_uid: privilegedActor.uid ?? null,
      actor_role: privilegedActor.role ?? requestedBy,
      status: providerResult?.ok ? "pg_cancelled" : "manual_review_required",
      pg_cancel_called: Boolean(providerResult?.ok && providerResult.realPgCalled),
      provider_cancel_ready: providerCancelReady,
      customer_guest_provider_cancel_blocked: customerGuestRequest,
      company_admin_provider_cancel_blocked: companyAdminRequest,
      provider_message: providerResult?.message ?? null,
      source: providerResult?.ok ? "firebase_functions_pg_cancel" : "firebase_functions_cancel_review",
      demo_read_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });

    if (paymentSnapshot?.ref && providerResult?.ok) {
      transaction.set(
        paymentSnapshot.ref,
        {
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancel_amount: providerResult.amount ?? cancelAmount,
          cancel_transaction_id: providerResult.transactionId ?? null,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    if (providerResult?.ok) {
      transaction.set(
        db.collection("orders").doc(orderNo),
        {
          status: "cancelled",
          payment_status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      for (const itemDocument of orderItemSnapshot?.docs ?? []) {
        const itemData = itemDocument.data();
        const itemProgramId = text(itemData.commerce_program_id);
        const orderedQuantity = Number(itemData.quantity ?? 0);
        const cancelledItem = cancelItems.find((item) => item.productId === text(itemData.product_id) && (!item.optionId || item.optionId === text(itemData.option_id)));
        const reversedQuantity = cancelItems.length ? Number(cancelledItem?.quantity ?? 0) : orderedQuantity;
        if (!itemProgramId || reversedQuantity <= 0 || orderedQuantity <= 0) continue;
        const ratio = Math.min(1, reversedQuantity / orderedQuantity);
        const customerSaleAmount = Number(itemData.line_amount ?? 0) * ratio;
        const partnerPayoutAmount = Number(itemData.settlement_amount ?? 0) * ratio;
        const reversalId = itemDocument.id + "-cancel-" + cancelRequestId;
        transaction.set(db.collection("settlement_ledger_entries").doc(reversalId), {
          id: reversalId,
          entry_type: "cancel_reversal",
          status: "calculated",
          commerce_program_id: itemProgramId,
          order_no: orderNo,
          order_item_id: itemDocument.id,
          original_entry_id: itemDocument.id + "-sale",
          pg_owner_company_id: itemData.pg_owner_company_id ?? null,
          supplier_business_id: itemData.supplier_business_id ?? null,
          reseller_business_id: itemData.reseller_business_id ?? null,
          settlement_recipient_business_id: itemData.settlement_recipient_business_id ?? null,
          customer_sale_amount: -customerSaleAmount,
          partner_payout_amount: -partnerPayoutAmount,
          gross_margin_amount: -(customerSaleAmount - partnerPayoutAmount),
          currency: "KRW",
          contract_version: itemData.margin_contract_version ?? null,
          cancel_request_id: cancelRequestId,
          created_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      cancelItems.forEach((item) => {
        transaction.update(db.collection("products").doc(item.productId), {
          inventory: FieldValue.increment(item.quantity),
          updated_at: FieldValue.serverTimestamp(),
        });
        transaction.set(db.collection("inventory_movements").doc(), {
          option_id: item.optionId ?? item.productId,
          product_id: item.productId,
          company_id: item.companyId,
          type: "release",
          quantity: item.quantity,
          reason: "pg_payment_cancel",
          source_id: orderNo,
          source: "firebase_functions_pg_cancel",
          created_at: new Date().toISOString(),
          updated_at: FieldValue.serverTimestamp(),
        });
      });
    }

    transaction.set(db.collection("audit_logs").doc(), {
      ...toAuditLogDocument(
        createAuditLogDraft({
          action: "payment_cancel_request",
          target: orderNo,
          severity: "blocked",
          message: "Real PG cancel/refund is blocked; manual review request recorded.",
        }),
      ),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    provider,
    pgReady: canCallProviderCancel,
    pgReadiness,
    payupRuntime: {
      provider,
      merchantIdPresent: Boolean(merchantId),
      transactionIdPresent: Boolean(paymentKey),
      apiKeyReady: payupMode ? payupApiKeyReady : Boolean(secretKey || cancelPwd),
      partialCancel: Boolean(paymentTotalAmount && cancelAmount > 0 && cancelAmount < paymentTotalAmount),
      providerCancelReady,
      customerGuestProviderCancelBlocked: customerGuestRequest,
      companyAdminProviderCancelBlocked: companyAdminRequest,
    },
    status: providerResult?.ok ? "cancelled" : "manual_review_required",
    orderNo,
    pgCancelCalled: Boolean(providerResult?.ok && providerResult.realPgCalled),
    firestoreTransactionPlan: [
      ...releasePlan.transactionSteps,
      ...getPgAdapterHandoffPlan(),
      "Mark refund/cancel request for manual review.",
      "Hold settlement payout until refund policy is approved.",
      `Append audit log at ${auditPlan.plannedPath}.`,
    ],
    message: providerResult?.message ?? (customerGuestRequest
      ? "Cancel request recorded for manual review. Customer guest requests do not call the PG cancel API directly."
      : companyAdminRequest
        ? "Company cancel/refund request recorded for manual review. PG cancellation is reserved for super-admin approval."
        : "Cancel request recorded for manual review. Real PG cancel needs provider readiness and a payment key."),
  });
}

function normalizeCancelRequester(value: unknown): PaymentCancelRequest["requestedBy"] {
  if (value === "SUPER_ADMIN" || value === "COMPANY_ADMIN" || value === "CUSTOMER_GUEST") return value;
  return "CUSTOMER_GUEST";
}

async function verifyPrivilegedCancelActor(
  request: HttpRequestLike,
  requestedBy: PaymentCancelRequest["requestedBy"],
  companyId: string,
  requestedCompanyId: string,
): Promise<
  | { ok: true; uid?: string; role?: string }
  | { ok: false; httpStatus: number; code: string; message: string }
> {
  if (requestedBy === "CUSTOMER_GUEST") return { ok: true };

  const token = authorizationToken(request);
  if (!token) {
    return {
      ok: false,
      httpStatus: 401,
      code: "PAYMENT_CANCEL_AUTH_REQUIRED",
      message: "Firebase ID token is required for admin cancel/refund requests.",
    };
  }

  const claims = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!claims) {
    return {
      ok: false,
      httpStatus: 403,
      code: "PAYMENT_CANCEL_AUTH_INVALID",
      message: "Firebase ID token is invalid.",
    };
  }

  const role = String(claims.role ?? "");
  const uid = String(claims.uid ?? "");
  const isSuperAdmin = role === "SUPER_ADMIN" || role === "seed_admin" || claims.seed_admin === true;
  if (requestedBy === "SUPER_ADMIN") {
    return isSuperAdmin
      ? { ok: true, uid, role }
      : {
          ok: false,
          httpStatus: 403,
          code: "PAYMENT_CANCEL_SUPER_ADMIN_REQUIRED",
          message: "Super admin permission is required for direct PG cancellation.",
        };
  }

  const claimCompanyId = String(claims.company_id ?? "");
  if (!companyId) {
    return {
      ok: false,
      httpStatus: 404,
      code: "PAYMENT_CANCEL_ORDER_NOT_FOUND",
      message: "A company-scoped order or payment record is required for company cancel/refund requests.",
    };
  }

  const targetCompanyId = companyId;
  if (!targetCompanyId) {
    return {
      ok: false,
      httpStatus: 409,
      code: "PAYMENT_CANCEL_COMPANY_SCOPE_MISSING",
      message: "Order company scope is missing.",
    };
  }

  if (requestedCompanyId && requestedCompanyId !== targetCompanyId) {
    return {
      ok: false,
      httpStatus: 403,
      code: "PAYMENT_CANCEL_COMPANY_SCOPE_MISMATCH",
      message: "Requested company scope does not match the order.",
    };
  }

  if (role === "COMPANY_ADMIN" && claimCompanyId === targetCompanyId) {
    return { ok: true, uid, role };
  }

  return {
    ok: false,
    httpStatus: 403,
    code: "PAYMENT_CANCEL_COMPANY_FORBIDDEN",
    message: "The signed-in company account cannot request cancel/refund for this order.",
  };
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
