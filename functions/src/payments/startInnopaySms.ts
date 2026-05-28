import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { assertAmount } from "../utils/assertAmount";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { InnopayRestClient } from "./innopayRestClient";
import { isInnopayRealCallEnabled, isInnopaySmsApiMode } from "./providerRuntime";
import {
  calculateItemsAmount,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type CartItemInput,
  type HttpRequestLike,
  type HttpResponseLike,
} from "./types";

type StartInnopaySmsRequest = {
  paymentIntentId: string;
  qrSessionId: string;
  orderNoCandidate?: string;
  clientAmount?: number;
  items?: CartItemInput[];
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryMethod?: "pickup" | "delivery";
  receiverAddress?: string;
  receiverAddressDetail?: string;
};

export async function paymentsStartInnopaySmsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<StartInnopaySmsRequest>(request);
  const paymentIntentId = text(body.paymentIntentId);
  const qrSessionId = text(body.qrSessionId);

  if (!paymentIntentId || !qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_INPUT_INVALID",
        message: "paymentIntentId and qrSessionId are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  if (!isInnopaySmsApiMode("infiny") || !isInnopayRealCallEnabled()) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_DISABLED",
        message: "Set INNOPAY_SMS_API_ENABLED=true or INNOPAY_REAL_CALLS_ENABLED=true in Firebase Functions before calling smsPayApi.",
        httpStatus: 409,
      },
    });
    return;
  }

  const buyerName = text(body.buyerName) || text(body.customerName);
  const buyerTel = normalizePhone(body.buyerTel || body.customerPhone);
  const buyerEmail = text(body.buyerEmail);

  if (!buyerName || !buyerTel) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_BUYER_REQUIRED",
        message: "buyerName/customerName and buyerTel/customerPhone are required for InnoPay SMS card payment.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const intentRef = db.collection("payment_intents").doc(paymentIntentId);
  const intentSnapshot = await intentRef.get();
  const intent = intentSnapshot.data() ?? {};

  if (!intentSnapshot.exists) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_INTENT_NOT_FOUND",
        message: "Payment intent was not found. Call paymentsReady first.",
        httpStatus: 404,
      },
    });
    return;
  }

  const intentStatus = text(intent.status);
  if (intentStatus === "pending_payment_link") {
    sendJson(response, 200, {
      ok: true,
      provider: "infiny",
      status: "pending_payment_link",
      paymentIntentId,
      orderNo: text(intent.order_no) || text(intent.orderNoCandidate) || text(intent.order_no_candidate),
      resultCode: text(intent.innopay_sms_result_code) || "ALREADY_REQUESTED",
      resultMsg: text(intent.innopay_sms_result_msg) || "InnoPay SMS payment request was already sent.",
      message: "이미 SMS 결제 요청이 전송되었습니다.",
    });
    return;
  }

  if (intentStatus !== "ready") {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_INTENT_NOT_READY",
        message: `Payment intent status must be ready. current=${intentStatus || "unknown"}`,
        httpStatus: 409,
      },
    });
    return;
  }

  const companyId = text(intent.company_id ?? intent.companyId);
  const mid = text(intent.merchant_id ?? intent.merchantId) || readEnv("INNOPAY_DEFAULT_MID") || readEnv("PG_MERCHANT_ID");
  const orderNo = text(body.orderNoCandidate) || text(intent.order_no_candidate ?? intent.orderNoCandidate);
  const intentAmount = numberValue(intent.recalculated_amount ?? intent.amount);
  const items = normalizeCartItems(body.items).length ? normalizeCartItems(body.items) : normalizeCartItems(intent.items);
  const recalculatedAmount = calculateItemsAmount(items);
  const amountAssertion = assertAmount(body.clientAmount ?? intentAmount, recalculatedAmount || intentAmount);

  if (!mid || !orderNo || !intentAmount || !amountAssertion.ok) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_READY_DATA_INVALID",
        message: !mid
          ? "Company InnoPay MID is missing."
          : !orderNo
            ? "A5 order number is missing."
            : !intentAmount
              ? "Payment amount is missing."
              : "Client amount does not match server recalculated amount.",
        httpStatus: 409,
        details: amountAssertion.ok ? undefined : amountAssertion.error.details,
      },
    });
    return;
  }

  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(intentRef);
    const currentStatus = text(current.get("status"));

    if (currentStatus !== "ready") {
      throw new Error(`INNOPAY_SMS_INTENT_NOT_READY:${currentStatus}`);
    }

    transaction.set(
      intentRef,
      {
        status: "sms_requesting",
        sms_requesting_at: new Date().toISOString(),
        order_no: orderNo,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  const credential = companyId ? (await db.collection("company_pg_credentials").doc(companyId).get()).data() ?? {} : {};
  const userId = text(intent.company_name) || companyId || text(credential.company_name);
  const client = new InnopayRestClient();
  const innopayResult = await client.createSmsPaymentRequest({
    mid,
    payExpDate: readEnv("INNOPAY_SMS_PAY_EXP_DATE"),
    userId,
    moid: orderNo,
    goodsName: makeGoodsName(items, orderNo),
    amt: String(intentAmount),
    dutyFreeAmt: readEnv("INNOPAY_SMS_DUTY_FREE_AMT"),
    buyerName,
    buyerTel,
    buyerEmail,
    svcPrdtCd: readSvcPrdtCd(),
  });

  const now = new Date().toISOString();

  if (!innopayResult.ok) {
    await intentRef.set(
      {
        status: "failed",
        failure_code: innopayResult.resultCode ?? "INNOPAY_SMS_REQUEST_FAILED",
        failure_message: innopayResult.resultMsg,
        innopay_sms_result_code: innopayResult.resultCode ?? null,
        innopay_sms_result_msg: innopayResult.resultMsg,
        innopay_sms_raw_masked: innopayResult.rawMasked ?? null,
        failed_at: now,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    sendJson(response, 502, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_REQUEST_FAILED",
        message: innopayResult.resultMsg,
        httpStatus: 502,
        details: {
          resultCode: innopayResult.resultCode,
          httpStatus: innopayResult.httpStatus,
        },
      },
    });
    return;
  }

  const paymentRef = db.collection("payments").doc(paymentIntentId);
  const eventRef = db.collection("payment_events").doc(`${paymentIntentId}-innopay-sms-requested`);
  const auditRef = db.collection("audit_logs").doc();
  const buyerPhoneMasked = maskPhone(buyerTel);

  await db.runTransaction(async (transaction) => {
    transaction.set(
      intentRef,
      {
        status: "pending_payment_link",
        order_no: orderNo,
        buyer_name: buyerName,
        buyer_phone_masked: buyerPhoneMasked,
        buyer_email_present: Boolean(buyerEmail),
        delivery_method: body.deliveryMethod ?? null,
        receiver_address: text(body.receiverAddress) || null,
        receiver_address_detail: text(body.receiverAddressDetail) || null,
        innopay_sms_requested_at: now,
        innopay_sms_result_code: innopayResult.resultCode,
        innopay_sms_result_msg: innopayResult.resultMsg,
        innopay_sms_raw_masked: innopayResult.rawMasked,
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
        company_id: companyId || null,
        pg_provider: "infiny",
        provider: "infiny",
        merchant_id: mid,
        status: "pending_payment_link",
        amount: intentAmount,
        currency: "KRW",
        buyer_name: buyerName,
        buyer_phone_masked: buyerPhoneMasked,
        buyer_email_present: Boolean(buyerEmail),
        delivery_method: body.deliveryMethod ?? null,
        receiver_address: text(body.receiverAddress) || null,
        receiver_address_detail: text(body.receiverAddressDetail) || null,
        source: "firebase_functions_innopay_sms_request",
        pg_sms_request_called: true,
        real_pg_called: true,
        innopay_sms_result_code: innopayResult.resultCode,
        innopay_sms_result_msg: innopayResult.resultMsg,
        innopay_sms_raw_masked: innopayResult.rawMasked,
        guest_lookup_enabled: true,
        demo_read_enabled: true,
        created_at: now,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      eventRef,
      {
        payment_intent_id: paymentIntentId,
        order_no: orderNo,
        qr_session_id: qrSessionId,
        company_id: companyId || null,
        event_type: "innopay_sms_requested",
        status: "pending_payment_link",
        amount: intentAmount,
        result_code: innopayResult.resultCode,
        result_msg: innopayResult.resultMsg,
        source: "firebase_functions_innopay_sms_request",
        created_at: now,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(auditRef, {
      ...toAuditLogDocument(
        createAuditLogDraft({
          action: "innopay_sms_payment_requested",
          target: paymentIntentId,
          severity: "info",
          message: "InnoPay SMS card payment request was sent after A5 server amount validation.",
        }),
      ),
      updated_at: FieldValue.serverTimestamp(),
    });
  });

  sendJson(response, 200, {
    ok: true,
    provider: "infiny",
    status: "pending_payment_link",
    paymentIntentId,
    orderNo,
    amount: intentAmount,
    resultCode: innopayResult.resultCode,
    resultMsg: innopayResult.resultMsg,
    buyerPhoneMasked,
    message: "인피니 SMS 카드결제 요청을 전송했습니다. 고객은 문자 링크에서 결제하고, 이후 거래조회로 승인 확정합니다.",
  });
}

function readSvcPrdtCd(): "03" | "04" {
  const value = readEnv("INNOPAY_SMS_SVC_PRDT_CD");
  return value === "04" ? "04" : "03";
}

function makeGoodsName(items: CartItemInput[], orderNo: string): string {
  const first = items[0]?.productName?.trim();
  const suffix = items.length > 1 ? ` 외 ${items.length - 1}건` : "";
  const value = first ? `${first}${suffix}` : `A5 ${orderNo}`;

  return value.length > 40 ? value.slice(0, 40) : value;
}

function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function maskPhone(phone: string): string {
  if (phone.length < 7) return phone ? "등록됨" : "";
  return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}
