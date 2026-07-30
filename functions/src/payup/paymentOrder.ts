import { randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import { getAdminDb } from "../firebaseAdmin";
import { enforceBrowserRequestGuards } from "../access/requestGuards";
import { AccessHttpError, asRecord, firestoreDocumentId, safeDocumentId, sendAccessError, text } from "../access/policy";
import {
  ORDER_PII_ENCRYPTION_KEY,
  PAYUP_API_CERT_KEY,
  PAYUP_API_KEY,
  assertFeatureFlags,
  assertRuntimeReady,
  getPayupRuntime,
  postPayup,
  sha256,
  timestampToken,
} from "./runtimeV2";
import {
  calculateDistributionPlan,
  encryptPrivateSnapshot,
  enforceOrderRateLimit,
  findQrSession,
  lockPlanAndReserve,
  makeOrderNumber,
  maskAddress,
  normalizeReceiver,
  publicFormFields,
  publicToken,
  publicTokenHash,
  releaseReservation,
  safeStoredFormFields,
  type JsonRecord,
  type ReceiverSnapshot,
} from "./paymentShared";
import {
  buildSubmerchantListPayload,
  payupCartPath,
  projectListResponse,
  projectSubmerchant,
} from "./cartApiV12";
import {
  recordPayupCartProviderHealth,
  recordPayupCartProviderHealthBestEffort,
} from "./providerHealth";

const REGION = "asia-northeast3";
const options = { region: REGION, cors: true, maxInstances: 30, secrets: [PAYUP_API_KEY, PAYUP_API_CERT_KEY, ORDER_PII_ENCRYPTION_KEY] };

async function assertExternalSubmerchantsReady(config: ReturnType<typeof getPayupRuntime>, plan: Awaited<ReturnType<typeof calculateDistributionPlan>>) {
  const businessNumberById = new Map<string, string>();
  for (const line of plan.lines) {
    if (line.businessNumber) businessNumberById.set(line.subMerchantId, line.businessNumber);
  }
  const subMerchantIds = [...new Set(plan.cartPayList.map((line) => line.subMerchantId))];
  for (const subMerchantId of subMerchantIds) {
    let result: JsonRecord;
    try {
      result = await postPayup({
        config,
        operation: "SUBMERCHANT_CHECKOUT_PREFLIGHT",
        pathOrUrl: payupCartPath(config.merchantId, "sub-list"),
        payload: buildSubmerchantListPayload(config.apiKey, { subMerchantId }),
        subMerchantId,
      });
    } catch (error) {
      await recordPayupCartProviderHealthBestEffort(config, {
        responseCode: "TRANSPORT_ERROR",
        responseMsg: error instanceof Error ? error.message : "PayUp checkout preflight failed",
        subMerchantId,
      });
      throw error;
    }
    const projected = projectListResponse(result, projectSubmerchant, config.merchantId);
    const responseCode = projected.responseCode;
    const match = projected.list.find((item) => text(item.subMerchantId, 20) === subMerchantId);
    const expectedBusinessNumber = businessNumberById.get(subMerchantId);
    const actualBusinessNumber = text(match?.subBusinessNumber, 20).replace(/[^0-9]/g, "");
    const businessNumberMatches = !expectedBusinessNumber || actualBusinessNumber === expectedBusinessNumber;
    await recordPayupCartProviderHealth(config, {
      responseCode,
      responseMsg: projected.responseMsg,
      subMerchantId,
      matched: Boolean(match) && businessNumberMatches,
    });
    if (responseCode !== "0000") {
      throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_LOOKUP_FAILED", `${subMerchantId} 운영 등록 조회가 실패했습니다: ${responseCode || "응답코드 없음"}`);
    }
    if (!match) throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_NOT_REGISTERED", `${subMerchantId}이 현재 운영 MID의 PayUp 하위가맹점 목록에 없습니다.`);
    if (!businessNumberMatches) {
      throw new AccessHttpError(409, "PAYUP_SUBMERCHANT_BUSINESS_MISMATCH", `${subMerchantId}의 PayUp 사업자번호 매핑이 내부 분배정책과 일치하지 않습니다.`);
    }
  }
}

export const payupPaymentOrder = onRequest(options, async (request, response) => {
  let paymentSessionId = "";
  try {
    if (request.method !== "POST") throw new AccessHttpError(405, "METHOD_NOT_ALLOWED", "POST 요청만 허용됩니다.");
    await enforceBrowserRequestGuards(request);
    await assertFeatureFlags(["PAYUP_MASTER", "NEW_ORDER", "PAYMENT_WINDOW", "CART_DISTRIBUTION"]);
    const config = getPayupRuntime();
    assertRuntimeReady(config, { requireApiCertKey: true, requireAuthReturn: true, requirePiiKey: true });
    const body = asRecord(request.body);
    const shortCode = text(body.shortCode, 80);
    if (shortCode) await enforceOrderRateLimit(request, shortCode);
    const qr = await findQrSession({ qrSessionId: text(body.qrSessionId, 1500), shortCode });

    const buyerName = text(body.buyerName, 50);
    if (!buyerName) throw new AccessHttpError(400, "PAYUP_BUYER_REQUIRED", "구매자명이 필요합니다.");
    const buyerEmail = text(body.buyerEmail, 50);
    if (buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerEmail)) throw new AccessHttpError(400, "PAYUP_BUYER_EMAIL_INVALID", "구매자 이메일 형식이 올바르지 않습니다.");
    const buyerPhone = text(body.buyerPhone, 30);
    const phoneDigits = buyerPhone.replace(/[^0-9]/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) throw new AccessHttpError(400, "PAYUP_BUYER_PHONE_INVALID", "구매자 연락처는 숫자 10~11자리여야 합니다.");
    const buyerPhoneMasked = `${phoneDigits.slice(0, 3)}-****-${phoneDigits.slice(-4)}`;

    const requestedReceiver = normalizeReceiver(body.receiver);
    const pickup = asRecord(qr.data.pickup_location ?? qr.data.pickupLocation);
    const receiver = requestedReceiver.deliveryMethod === "pickup"
      ? {
          deliveryMethod: "pickup" as const,
          address: text(pickup.nurseryAddress ?? pickup.nursery_address, 300),
          addressDetail: text(pickup.roomName ?? pickup.room_name, 300),
        }
      : requestedReceiver;
    if (!receiver.address) throw new AccessHttpError(400, "PAYUP_RECEIVER_ADDRESS_REQUIRED", "수령 주소가 필요합니다.");

    const buyerNameMasked = buyerName.length > 1 ? `${buyerName.slice(0, 1)}*` : "*";
    const buyerEmailMasked = buyerEmail ? buyerEmail.replace(/(^.).*(@.*$)/, "$1***$2") : "";
    const receiverSummary: ReceiverSnapshot = { deliveryMethod: receiver.deliveryMethod, address: maskAddress(receiver.address), addressDetail: receiver.addressDetail ? "***" : "" };
    const privateSnapshotEncrypted = encryptPrivateSnapshot({ buyerName, buyerEmail, buyerPhone, receiver }, config.orderPiiEncryptionKey);
    const userAgent: "WM" | "WP" = text(body.userAgent, 2) === "WP" ? "WP" : "WM";
    const orderNumber = makeOrderNumber();
    const clientToken = publicToken();
    const authReturnState = publicToken();
    paymentSessionId = firestoreDocumentId(`payup-${randomUUID().replaceAll("-", "")}`, "paymentSessionId");
    const plan = await calculateDistributionPlan(qr.id, qr.data, orderNumber, config.merchantId);
    await assertExternalSubmerchantsReady(config, plan);
    await lockPlanAndReserve({
      paymentSessionId,
      plan,
      buyerNameMasked,
      buyerEmailMasked,
      buyerPhoneMasked,
      receiverSummary,
      privateSnapshotEncrypted,
      clientTokenHash: publicTokenHash(clientToken),
      authReturnStateHash: publicTokenHash(authReturnState),
      userAgent,
    });

    const sourceChannel = text(qr.data.source_channel, 30).toUpperCase();
    const sourceSite = text(qr.data.source_site, 50);
    const sourceOrderNo = text(qr.data.source_order_no, 200);
    const successReturnUrl = text(qr.data.success_return_url, 1000);
    const failureReturnUrl = text(qr.data.failure_return_url, 1000);
    await getAdminDb().doc(`payup_payment_sessions/${paymentSessionId}`).set({
      source_channel: sourceChannel || null,
      source_site: sourceSite || null,
      source_order_no: sourceOrderNo || null,
      source_success_return_url: successReturnUrl || null,
      source_failure_return_url: failureReturnUrl || null,
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    }, { merge: true });
    if (sourceChannel && sourceOrderNo) {
      await getAdminDb().doc(`channel_order_links/${safeDocumentId(`${sourceChannel}-${sourceOrderNo}`)}`).set({
        central_order_number: plan.orderNumber,
        payment_session_id: paymentSessionId,
        status: "PAYUP_ORDER_CREATING",
        updated_at: FieldValue.serverTimestamp(),
        updated_at_iso: new Date().toISOString(),
      }, { merge: true });
    }

    const timestamp = timestampToken();
    const authReturnUrl = new URL(config.authReturnUrl);
    authReturnUrl.searchParams.set("session", paymentSessionId);
    authReturnUrl.searchParams.set("state", authReturnState);
    if (authReturnUrl.toString().length > 200) {
      await releaseReservation(paymentSessionId, "ORDER_FAILED", "auth_return URL 200자 초과");
      throw new AccessHttpError(409, "PAYUP_AUTH_RETURN_URL_TOO_LONG", "PayUp auth_return URL은 200자 이하여야 합니다.");
    }

    const payload: JsonRecord = {
      orderNumber: plan.orderNumber,
      amount: String(plan.totalAmount),
      itemName: plan.items.length === 1 ? plan.items[0].productName.slice(0, 100) : `${plan.items[0].productName} 외 ${plan.items.length - 1}건`.slice(0, 100),
      userName: buyerName,
      userAgent,
      userEmail: buyerEmail,
      signature: sha256([config.merchantId, plan.orderNumber, String(plan.totalAmount), config.apiCertKey, timestamp]),
      timestamp,
      auth_return: authReturnUrl.toString(),
      bypassValue: paymentSessionId,
    };
    const result = await postPayup({ config, operation: "PAYMENT_ORDER", pathOrUrl: `/ap/api/payment/${encodeURIComponent(config.merchantId)}/order`, payload, orderNumber: plan.orderNumber, requireApiCertKey: true });
    if (text(result.responseCode, 100) !== "0000") {
      await releaseReservation(paymentSessionId, "ORDER_FAILED", text(result.responseMsg, 500) || "PayUp 주문요청 거절");
      throw new AccessHttpError(502, "PAYUP_ORDER_REJECTED", text(result.responseMsg, 500) || "PayUp 주문요청이 거절됐습니다.");
    }
    const payUrl = text(result.payUrl, 1000);
    if (!payUrl) {
      await releaseReservation(paymentSessionId, "ORDER_FAILED", "PayUp 주문응답 payUrl 누락");
      throw new AccessHttpError(502, "PAYUP_PAY_URL_MISSING", "PayUp 주문응답에 payUrl이 없습니다.");
    }
    const fields = publicFormFields(result, paymentSessionId);
    await getAdminDb().doc(`payup_payment_sessions/${paymentSessionId}`).set({
      status: "AUTH_PENDING",
      environment: config.environment,
      pay_url: payUrl,
      form_fields_safe: safeStoredFormFields(fields),
      payment_state: "AUTH_PENDING",
      updated_at: FieldValue.serverTimestamp(),
      updated_at_iso: new Date().toISOString(),
    }, { merge: true });
    if (sourceChannel && sourceOrderNo) {
      await getAdminDb().doc(`channel_order_links/${safeDocumentId(`${sourceChannel}-${sourceOrderNo}`)}`).set({
        status: "AUTH_PENDING",
        updated_at: FieldValue.serverTimestamp(),
        updated_at_iso: new Date().toISOString(),
      }, { merge: true });
    }
    response.status(200).json({
      ok: true,
      provider: "payup",
      paymentSessionId,
      orderNumber: plan.orderNumber,
      sourceChannel: sourceChannel || undefined,
      sourceOrderNo: sourceOrderNo || undefined,
      amount: plan.totalAmount,
      userAgent,
      formAction: "https://web.nicepay.co.kr/v3/v3Payment.jsp",
      pcScriptUrl: "https://web.nicepay.co.kr/v3/webstd/js/nicepay-3.0.js",
      fields,
      clientToken,
    });
  } catch (error) {
    if (paymentSessionId) {
      try {
        const snapshot = await getAdminDb().doc(`payup_payment_sessions/${paymentSessionId}`).get();
        if (text(snapshot.data()?.status, 30) === "ORDER_CREATING") await releaseReservation(paymentSessionId, "ORDER_FAILED", error instanceof Error ? error.message : "주문요청 실패");
      } catch {
        // 예약만료 스케줄러가 남은 예약을 정리합니다.
      }
    }
    sendAccessError(response, error);
  }
});
