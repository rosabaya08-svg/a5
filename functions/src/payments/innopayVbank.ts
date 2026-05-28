import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { assertAmount } from "../utils/assertAmount";
import { InnopayRestClient } from "./innopayRestClient";
import { readInnopayCompanyCredentials, readInnopayRuntimeSettings } from "./innopayRuntime";
import { paymentsConfirmHandler } from "./confirm";
import {
  calculateItemsAmount,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
} from "./types";

type StartVbankRequest = {
  paymentIntentId: string;
  qrSessionId: string;
  clientAmount?: number;
  buyerName?: string;
  buyerTel?: string;
  buyerEmail?: string;
  vbankBankCode: string;
  vbankAccountName?: string;
  countryCode?: string;
  socNo: string;
  addr?: string;
  accountTel?: string;
};

export async function paymentsStartInnopayVbankHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<StartVbankRequest>(request);
  const paymentIntentId = text(body.paymentIntentId);
  const qrSessionId = text(body.qrSessionId);

  if (!paymentIntentId || !qrSessionId || !text(body.vbankBankCode) || !text(body.socNo)) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "INNOPAY_VBANK_INPUT_INVALID",
        message: "paymentIntentId, qrSessionId, vbankBankCode, and socNo are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const runtime = await readInnopayRuntimeSettings(db);

  if (!runtime.vbankEnabled || !runtime.realCallsEnabled) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_VBANK_DISABLED",
        message: "PG 연동 탭에서 가상계좌 API 사용 또는 실 PG 호출 허용을 켠 뒤 저장해야 vbankApi를 호출할 수 있습니다.",
        httpStatus: 409,
      },
    });
    return;
  }

  const intentRef = db.collection("payment_intents").doc(paymentIntentId);
  const intentSnapshot = await intentRef.get();
  const intent = intentSnapshot.data() ?? {};

  if (!intentSnapshot.exists) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "INNOPAY_VBANK_INTENT_NOT_FOUND",
        message: "Payment intent was not found. Call paymentsReady first.",
        httpStatus: 404,
      },
    });
    return;
  }

  const status = text(intent.status);
  if (status !== "ready") {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_VBANK_INTENT_NOT_READY",
        message: `Payment intent status must be ready. current=${status || "unknown"}`,
        httpStatus: 409,
      },
    });
    return;
  }

  const companyId = text(intent.company_id ?? intent.companyId);
  const credential = await readInnopayCompanyCredentials(companyId, db);
  const mid = text(intent.merchant_id ?? intent.merchantId) || credential.mid;
  const licenseKey = credential.licenseKey;
  const orderNo = text(intent.order_no ?? intent.order_no_candidate ?? intent.orderNoCandidate);
  const amount = numberValue(intent.recalculated_amount ?? intent.amount);
  const items = normalizeCartItems(intent.items);
  const recalculatedAmount = calculateItemsAmount(items) || amount;
  const amountAssertion = assertAmount(body.clientAmount ?? amount, recalculatedAmount);
  const buyerName = text(body.buyerName) || text(intent.buyer_name) || "Guest";
  const buyerTel = normalizePhone(body.buyerTel || intent.buyer_tel || intent.buyer_phone_masked);
  const accountTel = normalizePhone(body.accountTel || body.buyerTel || intent.buyer_tel);
  const vbankAccountName = text(body.vbankAccountName) || buyerName;

  if (!mid || !licenseKey || !orderNo || !amountAssertion.ok || !buyerTel || !accountTel || !vbankAccountName) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_VBANK_READY_DATA_INVALID",
        message: !mid
          ? "InnoPay MID is missing."
          : !licenseKey
            ? "InnoPay licenseKey is missing."
            : !orderNo
              ? "A5 order number is missing."
              : !amountAssertion.ok
                ? "Client amount does not match server recalculated amount."
                : "buyerTel, accountTel, or vbankAccountName is missing.",
        httpStatus: 409,
        details: amountAssertion.ok ? undefined : amountAssertion.error.details,
      },
    });
    return;
  }

  await intentRef.set({ status: "vbank_requesting", updated_at: FieldValue.serverTimestamp() }, { merge: true });

  const result = await new InnopayRestClient({ baseUrl: runtime.apiBaseUrl }).createVbank({
    mid,
    licenseKey,
    moid: orderNo,
    goodsCnt: String(Math.max(items.length, 1)),
    goodsName: makeGoodsName(items, orderNo),
    amt: String(recalculatedAmount),
    buyerName,
    buyerTel,
    buyerEmail: text(body.buyerEmail),
    vbankBankCode: text(body.vbankBankCode),
    vbankExpDate: readEnv("INNOPAY_VBANK_EXP_DATE"),
    vbankAccountName,
    countryCode: text(body.countryCode) || "KR",
    socNo: text(body.socNo),
    addr: text(body.addr),
    accountTel,
    receiptAmt: readEnv("INNOPAY_VBANK_RECEIPT_AMT"),
    receiptServiceAmt: readEnv("INNOPAY_VBANK_RECEIPT_SERVICE_AMT"),
    receiptType: readReceiptType(),
    receiptIdentity: readEnv("INNOPAY_VBANK_RECEIPT_IDENTITY"),
    mallReserved: paymentIntentId,
    userId: text(intent.company_name) || companyId,
  });

  if (!result.ok) {
    await intentRef.set(
      {
        status: "failed",
        failure_code: result.resultCode ?? "INNOPAY_VBANK_REQUEST_FAILED",
        failure_message: result.resultMsg,
        innopay_vbank_raw_masked: result.rawMasked ?? null,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    sendJson(response, 502, {
      ok: false,
      error: {
        code: "INNOPAY_VBANK_REQUEST_FAILED",
        message: result.resultMsg,
        httpStatus: 502,
        details: { resultCode: result.resultCode, httpStatus: result.httpStatus },
      },
    });
    return;
  }

  const now = new Date().toISOString();
  await db.runTransaction(async (transaction) => {
    transaction.set(
      intentRef,
      {
        status: "waiting_deposit",
        order_no: orderNo,
        innopay_tid: result.data.tid ?? null,
        vbank_num_masked: maskAccount(result.data.vbankNum),
        vbank_bank_name: result.data.vbankBankNm ?? null,
        innopay_vbank_result_code: result.resultCode,
        innopay_vbank_result_msg: result.resultMsg,
        innopay_vbank_raw_masked: result.rawMasked,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    transaction.set(
      db.collection("payments").doc(paymentIntentId),
      {
        id: paymentIntentId,
        payment_id: paymentIntentId,
        payment_intent_id: paymentIntentId,
        order_no: orderNo,
        qr_session_id: qrSessionId,
        company_id: companyId || null,
        pg_provider: "infiny",
        provider: "infiny",
        merchant_id: mid,
        status: "waiting_deposit",
        amount: recalculatedAmount,
        currency: "KRW",
        provider_transaction_id: result.data.tid ?? null,
        vbank_num_masked: maskAccount(result.data.vbankNum),
        vbank_bank_name: result.data.vbankBankNm ?? null,
        source: "firebase_functions_innopay_vbank_request",
        real_pg_called: true,
        created_at: now,
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });

  sendJson(response, 200, {
    ok: true,
    provider: "infiny",
    status: "waiting_deposit",
    paymentIntentId,
    orderNo,
    tid: result.data.tid ?? null,
    vbankBankName: result.data.vbankBankNm ?? null,
    vbankNumMasked: maskAccount(result.data.vbankNum),
    resultCode: result.resultCode,
    resultMsg: result.resultMsg,
    message: "인피니 가상계좌 발급이 완료되었습니다. 입금 완료는 Noti 또는 거래조회로 확정합니다.",
  });
}

export async function paymentsInnopayVbankNotiHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "POST") {
    response.status(405).send?.("9999");
    return;
  }

  const body = parseFormBody(request);
  const tid = text(body.tid);
  const moid = text(body.moid);
  const status = text(body.status);
  const pgTid = text(body.pgTid);
  const eventId = `innopay-vbank:${status}:${tid || moid}:${pgTid || text(body.pgAppDate) + text(body.pgAppTime)}`;
  const db = getAdminDb();
  const paymentSnapshot = tid
    ? (await db.collection("payments").where("provider_transaction_id", "==", tid).limit(1).get()).docs[0]
    : (await db.collection("payments").where("order_no", "==", moid).limit(1).get()).docs[0];
  const payment = paymentSnapshot?.data() ?? {};
  const paymentIntentId = text(payment.payment_intent_id ?? paymentSnapshot?.id);

  await db.collection("webhook_events").doc(eventId).set(
    {
      event_id: eventId,
      event_type: "innopay_vbank_noti",
      provider: "infiny",
      tid: tid || null,
      moid: moid || null,
      status: status || null,
      status_name: text(body.statusName) || null,
      pg_tid: pgTid || null,
      amount: numberValue(body.goodsAmt),
      raw_masked: maskNoti(body),
      created_at: new Date().toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  if (status === "25" && paymentIntentId) {
    const confirmResult: { statusCode?: number; body?: unknown } = {};
    await paymentsConfirmHandler(
      {
        method: "POST",
        body: {
          qrSessionId: text(payment.qr_session_id),
          paymentIntentId,
          orderNoCandidate: moid || text(payment.order_no),
          clientAmount: numberValue(payment.amount),
          items: normalizeCartItems((await db.collection("payment_intents").doc(paymentIntentId).get()).data()?.items),
          transactionId: tid,
        },
      },
      {
        status(code: number) {
          confirmResult.statusCode = code;
          return this;
        },
        json(body: unknown) {
          confirmResult.body = body;
        },
      },
    );

    await db.collection("webhook_events").doc(eventId).set(
      {
        confirm_status_code: confirmResult.statusCode ?? null,
        confirm_ok: isOkBody(confirmResult.body),
        confirm_response_masked: maskNoti(asRecord(confirmResult.body)),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    response.status(200).send?.("0000");
    return;
  }

  if (status === "85" && paymentSnapshot?.ref) {
    await paymentSnapshot.ref.set({ status: "cancelled", updated_at: FieldValue.serverTimestamp() }, { merge: true });
  }

  response.status(200).send?.("0000");
}

function parseFormBody(request: HttpRequestLike): Record<string, unknown> {
  if (request.body && typeof request.body === "object" && !Array.isArray(request.body)) return request.body as Record<string, unknown>;
  const raw = typeof request.rawBody === "string" ? request.rawBody : Buffer.isBuffer(request.rawBody) ? request.rawBody.toString("utf8") : "";
  return Object.fromEntries(new URLSearchParams(raw));
}

function readReceiptType(): "0" | "1" | "2" | undefined {
  const value = readEnv("INNOPAY_VBANK_RECEIPT_TYPE");
  return value === "0" || value === "1" || value === "2" ? value : undefined;
}

function maskNoti(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [/AcctNo|soc|identity/i.test(key) ? [key, "[masked]"] : [key, value]]));
}

function isOkBody(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value as { ok?: unknown }).ok === true);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function makeGoodsName(items: ReturnType<typeof normalizeCartItems>, orderNo: string): string {
  const first = items[0]?.productName?.trim();
  const suffix = items.length > 1 ? ` 외 ${items.length - 1}건` : "";
  const value = first ? `${first}${suffix}` : `A5 ${orderNo}`;
  return value.length > 40 ? value.slice(0, 40) : value;
}

function normalizePhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

function maskAccount(value: unknown): string {
  const textValue = text(value);
  if (!textValue) return "";
  if (textValue.length <= 6) return "******";
  return `${textValue.slice(0, 3)}${"*".repeat(Math.max(textValue.length - 6, 4))}${textValue.slice(-3)}`;
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
