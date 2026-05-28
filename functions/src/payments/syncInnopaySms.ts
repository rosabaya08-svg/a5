import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { decryptCredential } from "./credentialCrypto";
import {
  InnopayRestClient,
  readInnopayTransactionAmount,
  readInnopayTransactionId,
  readInnopayTransactionStatus,
} from "./innopayRestClient";
import { paymentsConfirmHandler } from "./confirm";
import {
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
} from "./types";

type SyncInnopaySmsRequest = {
  paymentIntentId?: string;
  orderNo?: string;
  tid?: string;
};

export async function paymentsSyncInnopaySmsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<SyncInnopaySmsRequest>(request);
  const paymentIntentId = text(body.paymentIntentId);
  const orderNoInput = text(body.orderNo);
  const tidInput = text(body.tid);

  if (!paymentIntentId && !orderNoInput) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_SYNC_INPUT_INVALID",
        message: "paymentIntentId or orderNo is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const paymentSnapshot = paymentIntentId
    ? await db.collection("payments").doc(paymentIntentId).get()
    : (await db.collection("payments").where("order_no", "==", orderNoInput).limit(1).get()).docs[0];
  const payment = paymentSnapshot?.data() ?? {};
  const resolvedPaymentIntentId = paymentIntentId || text(payment.payment_intent_id ?? paymentSnapshot?.id);
  const intentSnapshot = resolvedPaymentIntentId ? await db.collection("payment_intents").doc(resolvedPaymentIntentId).get() : undefined;
  const intent = intentSnapshot?.data() ?? {};

  if (!paymentSnapshot?.exists || !intentSnapshot?.exists) {
    sendJson(response, 404, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_SYNC_PAYMENT_NOT_FOUND",
        message: "Pending InnoPay SMS payment was not found.",
        httpStatus: 404,
      },
    });
    return;
  }

  const companyId = text(payment.company_id ?? intent.company_id);
  const mid = text(payment.merchant_id ?? intent.merchant_id) || readEnv("INNOPAY_DEFAULT_MID") || readEnv("PG_MERCHANT_ID");
  const orderNo = text(payment.order_no ?? intent.order_no ?? intent.order_no_candidate) || orderNoInput;
  const credential = companyId ? (await db.collection("company_pg_credentials").doc(companyId).get()).data() ?? {} : {};
  const merchantKey = decryptCredential(credential.encrypted_sign_key) || readEnv("INNOPAY_DEFAULT_MERCHANT_KEY") || readEnv("INNOPAY_MERCHANT_KEY");

  if (!mid || !merchantKey || !orderNo) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_SYNC_CREDENTIALS_MISSING",
        message: !mid
          ? "InnoPay MID is missing."
          : !merchantKey
            ? "InnoPay Merchant-Key is missing. Store it as company sign key or set INNOPAY_DEFAULT_MERCHANT_KEY."
            : "A5 order number is missing.",
        httpStatus: 409,
      },
    });
    return;
  }

  const lookup = tidInput
    ? await new InnopayRestClient().getTransactionByTid({ mid, merchantKey, tid: tidInput })
    : await new InnopayRestClient().getTransactionByMoid({ mid, merchantKey, moid: orderNo });

  if (!lookup.ok) {
    sendJson(response, 502, {
      ok: false,
      error: {
        code: "INNOPAY_SMS_TRANSACTION_LOOKUP_FAILED",
        message: lookup.resultMsg,
        httpStatus: 502,
        details: {
          resultCode: lookup.resultCode,
          httpStatus: lookup.httpStatus,
        },
      },
    });
    return;
  }

  const transactionStatus = readInnopayTransactionStatus(lookup.data);
  const transactionId = readInnopayTransactionId(lookup.data) || tidInput;
  const providerAmount = readInnopayTransactionAmount(lookup.data);
  const now = new Date().toISOString();

  if (transactionStatus !== "approved") {
    await db.runTransaction(async (transaction) => {
      transaction.set(
        paymentSnapshot.ref,
        {
          last_innopay_sync_at: now,
          innopay_transaction_status: transactionStatus,
          innopay_transaction_id: transactionId || null,
          innopay_transaction_amount: providerAmount ?? null,
          innopay_transaction_raw_masked: lookup.rawMasked,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      transaction.set(
        intentSnapshot.ref,
        {
          last_innopay_sync_at: now,
          innopay_transaction_status: transactionStatus,
          innopay_transaction_id: transactionId || null,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    sendJson(response, 200, {
      ok: true,
      provider: "infiny",
      status: "pending_payment_link",
      transactionStatus,
      paymentIntentId: resolvedPaymentIntentId,
      orderNo,
      transactionId: transactionId || null,
      message: "아직 인피니 SMS 카드결제 승인 완료 상태가 아닙니다. 결제 후 다시 확인하세요.",
    });
    return;
  }

  const items = normalizeCartItems(intent.items);
  await paymentsConfirmHandler(
    {
      method: "POST",
      body: {
        qrSessionId: text(intent.qrSessionId ?? intent.qr_session_id),
        paymentIntentId: resolvedPaymentIntentId,
        orderNoCandidate: orderNo,
        clientAmount: numberValue(intent.recalculated_amount ?? intent.amount),
        items,
        transactionId,
        customerName: text(payment.buyer_name ?? intent.buyer_name),
        customerPhoneMasked: text(payment.buyer_phone_masked ?? intent.buyer_phone_masked),
        deliveryMethod: payment.delivery_method === "delivery" ? "delivery" : "pickup",
        receiverAddress: text(payment.receiver_address ?? intent.receiver_address),
        receiverAddressDetail: text(payment.receiver_address_detail ?? intent.receiver_address_detail),
      },
    },
    response,
  );
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
