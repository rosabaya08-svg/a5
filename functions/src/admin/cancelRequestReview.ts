import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { decryptCredential } from "../payments/credentialCrypto";
import { cancelProviderPayment } from "../payments/providerAdapter";
import { getPgServerReadiness, isPayupProvider } from "../payments/providerRuntime";
import {
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CartItemInput,
  type HttpRequestLike,
  type HttpResponseLike,
} from "../payments/types";

type AdminCancelRequestReviewAction = "approve_pg_cancel" | "approve_manual" | "reject";

type AdminCancelRequestReviewBody = {
  requestId?: string;
  action?: AdminCancelRequestReviewAction;
  reviewMemo?: string;
};

type AdminActor = {
  uid: string;
  email: string;
  role: string;
};

const masterAdminEmail = "rosabaya08@gmail.com";
const allowedActions = new Set<AdminCancelRequestReviewAction>(["approve_pg_cancel", "approve_manual", "reject"]);

export async function adminCancelRequestReviewHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const actor = await requireSuperAdmin(request, response);
  if (!actor) return;

  const body = readObjectBody<AdminCancelRequestReviewBody>(request);
  const requestId = text(body.requestId);
  const action = text(body.action) as AdminCancelRequestReviewAction;
  const reviewMemo = text(body.reviewMemo) || "No review memo supplied.";

  if (!requestId || !allowedActions.has(action)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "ADMIN_CANCEL_REVIEW_INPUT_INVALID",
        message: "requestId and valid action are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const requestRef = db.collection("cancel_requests").doc(requestId);
  const requestSnapshot = await requestRef.get();

  if (!requestSnapshot.exists) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "ADMIN_CANCEL_REVIEW_NOT_FOUND",
        message: "Cancel/refund request was not found.",
        httpStatus: 404,
      },
    });
    return;
  }

  const requestData = requestSnapshot.data() ?? {};
  const orderNo = text(requestData.order_no ?? requestData.orderNo);
  const amount = numberValue(requestData.amount);
  const companyId = text(requestData.company_id ?? requestData.companyId);
  const paymentKeyFromRequest = text(requestData.payment_key ?? requestData.paymentKey);
  const items = normalizeCartItems(requestData.items);
  const now = new Date().toISOString();

  if (!orderNo) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "ADMIN_CANCEL_REVIEW_ORDER_MISSING",
        message: "Cancel/refund request is missing order_no.",
        httpStatus: 409,
      },
    });
    return;
  }

  if (action === "reject") {
    await db.runTransaction(async (transaction) => {
      transaction.set(requestRef, reviewPatch({
        status: "rejected",
        action,
        actor,
        reviewMemo,
        now,
      }), { merge: true });
      transaction.set(db.collection("audit_logs").doc(), auditLog(actor, "payment_cancel_rejected", requestId, reviewMemo, now));
    });

    sendJson(response, 200, {
      ok: true,
      requestId,
      orderNo,
      status: "rejected",
      pgCancelCalled: false,
      message: "Cancel/refund request was rejected.",
    });
    return;
  }

  if (action === "approve_manual") {
    await db.runTransaction(async (transaction) => {
      transaction.set(requestRef, reviewPatch({
        status: "approved_manual_review",
        action,
        actor,
        reviewMemo,
        now,
      }), { merge: true });
      transaction.set(
        db.collection("orders").doc(orderNo),
        {
          status: "refund_reviewed",
          cancel_review_status: "approved_manual_review",
          cancel_reviewed_at: now,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(db.collection("audit_logs").doc(), auditLog(actor, "payment_cancel_manual_approved", requestId, reviewMemo, now));
    });

    sendJson(response, 200, {
      ok: true,
      requestId,
      orderNo,
      status: "approved_manual_review",
      pgCancelCalled: false,
      message: "Cancel/refund request was approved for manual handling.",
    });
    return;
  }

  const paymentSnapshot = (
    await db.collection("payments").where("order_no", "==", orderNo).limit(1).get()
  ).docs[0];
  const paymentData = paymentSnapshot?.data() ?? {};
  const orderSnapshot = await db.collection("orders").doc(orderNo).get();
  const orderData = orderSnapshot.data() ?? {};
  const targetCompanyId = companyId || text(paymentData.company_id ?? paymentData.companyId ?? orderData.company_id ?? orderData.companyId);
  const credentialSnapshot = targetCompanyId ? await db.collection("company_pg_credentials").doc(targetCompanyId).get() : undefined;
  const credentialData = credentialSnapshot?.data() ?? {};
  const provider = text(paymentData.pg_provider ?? paymentData.provider ?? orderData.pg_provider ?? credentialData.pg_provider ?? getPgServerReadiness().provider);
  const paymentKey = paymentKeyFromRequest || text(paymentData.provider_payment_key ?? paymentData.provider_transaction_id ?? paymentData.paymentKey);
  const paymentTotalAmount = numberValue(paymentData.amount ?? orderData.total_amount ?? orderData.totalAmount);
  const cancelAmount = amount || paymentTotalAmount;
  const secretKey = decryptCredential(credentialData.encrypted_secret_key);
  const cancelPwd = decryptCredential(credentialData.encrypted_merchant_password);
  const merchantId = text(
    paymentData.merchant_id ??
      orderData.merchant_id ??
      credentialData.payup_mid ??
      credentialData.mid ??
      credentialData.merchant_id,
  );
  const payupMode = isPayupProvider(provider);
  const payupApiKeyReady = Boolean(secretKey || process.env.PAYUP_API_KEY || process.env.PAYUP_API_CERT_KEY || process.env.PG_SECRET_KEY);
  const providerCancelReady = payupMode
    ? Boolean(merchantId && paymentKey && cancelAmount > 0 && payupApiKeyReady)
    : Boolean(getPgServerReadiness().readyForAdapter && paymentKey && (secretKey || cancelPwd));

  if (!providerCancelReady) {
    await db.runTransaction(async (transaction) => {
      transaction.set(requestRef, reviewPatch({
        status: "pg_cancel_blocked",
        action,
        actor,
        reviewMemo,
        now,
        extra: {
          provider,
          provider_cancel_ready: false,
          provider_block_reason: "PG credential, transaction id, or amount is missing.",
        },
      }), { merge: true });
      transaction.set(db.collection("audit_logs").doc(), auditLog(actor, "payment_cancel_pg_blocked", requestId, "PG credential, transaction id, or amount is missing.", now));
    });

    sendJson(response, 409, {
      ok: false,
      requestId,
      orderNo,
      status: "pg_cancel_blocked",
      pgCancelCalled: false,
      message: "PG cancel is not ready. Check MID/API key/transaction id/amount before approval.",
    });
    return;
  }

  const providerResult = await cancelProviderPayment({
    orderNo,
    provider,
    paymentKey,
    amount: cancelAmount,
    totalAmount: paymentTotalAmount,
    reason: reviewMemo,
    merchantId,
    cancelPwd,
    secretKey,
  });

  if (!providerResult.ok) {
    await db.runTransaction(async (transaction) => {
      transaction.set(requestRef, reviewPatch({
        status: "pg_cancel_failed",
        action,
        actor,
        reviewMemo,
        now,
        extra: {
          provider,
          provider_cancel_ready: true,
          provider_message: providerResult.message,
          provider_code: providerResult.code,
        },
      }), { merge: true });
      transaction.set(db.collection("audit_logs").doc(), auditLog(actor, "payment_cancel_pg_failed", requestId, providerResult.message, now));
    });

    sendJson(response, 502, {
      ok: false,
      requestId,
      orderNo,
      status: "pg_cancel_failed",
      pgCancelCalled: false,
      message: providerResult.message,
    });
    return;
  }

  await db.runTransaction(async (transaction) => {
    transaction.set(requestRef, reviewPatch({
      status: "pg_cancelled",
      action,
      actor,
      reviewMemo,
      now,
      extra: {
        provider,
        provider_cancel_ready: true,
        pg_cancel_called: Boolean(providerResult.realPgCalled),
        cancel_amount: providerResult.amount ?? cancelAmount,
        cancel_transaction_id: providerResult.transactionId ?? null,
        provider_message: providerResult.message,
      },
    }), { merge: true });

    if (paymentSnapshot?.ref) {
      transaction.set(
        paymentSnapshot.ref,
        {
          status: "cancelled",
          cancelled_at: now,
          cancel_amount: providerResult.amount ?? cancelAmount,
          cancel_transaction_id: providerResult.transactionId ?? null,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    transaction.set(
      db.collection("orders").doc(orderNo),
      {
        status: "cancelled",
        payment_status: "cancelled",
        cancel_review_status: "pg_cancelled",
        cancelled_at: now,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    releaseInventory(db, transaction, items, orderNo, now);
    transaction.set(db.collection("audit_logs").doc(), auditLog(actor, "payment_cancel_pg_cancelled", requestId, providerResult.message, now));
  });

  sendJson(response, 200, {
    ok: true,
    requestId,
    orderNo,
    status: "pg_cancelled",
    pgCancelCalled: Boolean(providerResult.realPgCalled),
    providerMessage: providerResult.message,
    message: "PG cancel was approved and completed.",
  });
}

function reviewPatch(input: {
  status: string;
  action: AdminCancelRequestReviewAction;
  actor: AdminActor;
  reviewMemo: string;
  now: string;
  extra?: Record<string, unknown>;
}) {
  return {
    ...input.extra,
    status: input.status,
    review_status: input.status,
    review_action: input.action,
    review_memo: input.reviewMemo,
    reviewed_by_uid: input.actor.uid,
    reviewed_by_email: input.actor.email,
    reviewed_by_role: input.actor.role,
    reviewed_at: input.now,
    updated_at: FieldValue.serverTimestamp(),
  };
}

function releaseInventory(
  db: Firestore,
  transaction: Transaction,
  items: CartItemInput[],
  orderNo: string,
  now: string,
) {
  for (const item of items) {
    transaction.set(db.collection("products").doc(item.productId), {
      inventory: FieldValue.increment(item.quantity),
      updated_at: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(db.collection("inventory_movements").doc(), {
      option_id: item.optionId ?? item.productId,
      product_id: item.productId,
      company_id: item.companyId,
      type: "release",
      quantity: item.quantity,
      reason: "admin_pg_payment_cancel",
      source_id: orderNo,
      source: "firebase_functions_admin_cancel_review",
      created_at: now,
      updated_at: FieldValue.serverTimestamp(),
    });
  }
}

function auditLog(actor: AdminActor, action: string, target: string, message: string, now: string) {
  return {
    actor_role: actor.role || "SUPER_ADMIN",
    actor_name: actor.email || actor.uid,
    actor_email: actor.email || null,
    action,
    target,
    message,
    source: "firebase_functions_admin_cancel_review",
    created_at: now,
    updated_at: FieldValue.serverTimestamp(),
  };
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<AdminActor | null> {
  const token = authorizationToken(request);

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "ADMIN_CANCEL_REVIEW_AUTH_REQUIRED",
        message: "Firebase ID token is required.",
        httpStatus: 401,
      },
    });
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = text(decoded.role);
    const email = text(decoded.email).toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) {
      return {
        uid: decoded.uid,
        email,
        role: role || (decoded.seed_admin === true ? "seed_admin" : "SUPER_ADMIN"),
      };
    }
  } catch {
    // Do not expose token details.
  }

  sendJson(response, 403, {
    ok: false,
    error: {
      code: "ADMIN_CANCEL_REVIEW_FORBIDDEN",
      message: "SUPER_ADMIN permission is required.",
      httpStatus: 403,
    },
  });
  return null;
}

function authorizationToken(request: HttpRequestLike) {
  const header = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  return header.replace(/^Bearer\s+/i, "").trim();
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function text(value: unknown) {
  return String(value ?? "").trim();
}
