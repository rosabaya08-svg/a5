import { releaseInventorySkeleton } from "../inventory/releaseInventory";
import { appendAuditLogSkeleton, createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getPgAdapterHandoffPlan, getPgServerReadiness } from "./providerRuntime";
import { cancelProviderPayment } from "./providerAdapter";
import { getAdminDb } from "../firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { decryptCredential } from "./credentialCrypto";
import { readInnopayRuntimeSettings } from "./innopayRuntime";
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
  const innopayRuntime = await readInnopayRuntimeSettings(db);
  const paymentSnapshot = (
    await db.collection("payments").where("order_no", "==", orderNo).limit(1).get()
  ).docs[0];
  const paymentData = paymentSnapshot?.data() ?? {};
  const orderSnapshot = await db.collection("orders").doc(orderNo).get();
  const orderData = orderSnapshot.data() ?? {};
  const paymentKey = String(body.paymentKey ?? paymentData.provider_payment_key ?? paymentData.provider_transaction_id ?? paymentData.paymentKey ?? "");
  const cancelAmount = Number(body.amount ?? paymentData.amount ?? 0);
  const companyId = String(paymentData.company_id ?? orderData.company_id ?? "");
  const credentialSnapshot = companyId ? await db.collection("company_pg_credentials").doc(companyId).get() : undefined;
  const secretKey = decryptCredential(credentialSnapshot?.data()?.encrypted_secret_key);
  const cancelPwd = decryptCredential(credentialSnapshot?.data()?.encrypted_merchant_password);
  const merchantId = String(paymentData.merchant_id ?? orderData.merchant_id ?? credentialSnapshot?.data()?.mid ?? credentialSnapshot?.data()?.merchant_id ?? "");
  const cancelItems = normalizeCartItems(body.items);
  const canCallProviderCancel = innopayRuntime.realCallsEnabled && Boolean(pgReadiness.readyForAdapter || secretKey || cancelPwd);
  const providerResult = canCallProviderCancel
    ? await cancelProviderPayment({
        orderNo,
        paymentKey,
        amount: cancelAmount,
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

  await db.runTransaction(async (transaction) => {
    transaction.set(db.collection("cancel_requests").doc(cancelRequestId), {
      order_no: orderNo,
      payment_id: paymentData.payment_id ?? paymentData.payment_intent_id ?? paymentSnapshot?.id ?? null,
      company_id: paymentData.company_id ?? orderData.company_id ?? null,
      nursery_id: orderData.nursery_id ?? paymentData.nursery_id ?? null,
      room_id: orderData.room_id ?? null,
      tablet_id: orderData.tablet_id ?? null,
      payment_key: paymentKey || null,
      amount: cancelAmount || null,
      reason: body.reason ?? "No reason supplied",
      requested_by: body.requestedBy ?? "CUSTOMER_GUEST",
      status: providerResult?.ok ? "pg_cancelled" : "manual_review_required",
      pg_cancel_called: Boolean(providerResult?.ok && providerResult.realPgCalled),
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
    ok: Boolean(providerResult?.ok),
    provider: pgReadiness.provider,
    pgReady: canCallProviderCancel,
    pgReadiness,
    innopayRuntime: {
      smsEnabled: innopayRuntime.smsEnabled,
      vbankEnabled: innopayRuntime.vbankEnabled,
      realCallsEnabled: innopayRuntime.realCallsEnabled,
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
    message: providerResult?.message ?? "Cancel request recorded for manual review. Real PG cancel needs provider readiness and a payment key.",
  });
}
