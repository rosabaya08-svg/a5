import { onRequest } from "firebase-functions/v2/https";
import { a4RoomsSyncHandler } from "./a4/syncRooms";
import { inventoryReleaseHandler } from "./inventory/releaseInventory";
import { inventoryReserveHandler } from "./inventory/reserveInventory";
import { ordersCreateHandler } from "./orders/createOrderSnapshot";
import { paymentsCancelHandler } from "./payments/cancel";
import { paymentsConfirmHandler } from "./payments/confirm";
import { paymentsReadyHandler } from "./payments/ready";
import { paymentsStatusHandler } from "./payments/status";
import { paymentsWebhookHandler } from "./payments/webhook";
import { qrCreateHandler, qrExpireHandler } from "./qr/validateQrSession";
import type { HttpRequestLike, HttpResponseLike } from "./payments/types";

const paymentFunctionOptions = {
  region: "asia-northeast3",
  cors: true,
  maxInstances: 10,
};

type LegacyPaymentHandler = (request: HttpRequestLike, response: HttpResponseLike) => Promise<void>;

function legacyMockPaymentEnabled() {
  return process.env.PAYUP_ENVIRONMENT !== "production" && String(process.env.A5_LEGACY_MOCK_PAYMENT_ENABLED ?? "").trim().toLowerCase() === "true";
}

function guardLegacyMockPayment(handler: LegacyPaymentHandler): LegacyPaymentHandler {
  return async (request, response) => {
    if (!legacyMockPaymentEnabled()) {
      response.status(410).json({
        ok: false,
        error: {
          code: "LEGACY_MOCK_PAYMENT_DISABLED",
          message: "구형 mock 결제·QR·주문·재고 엔드포인트는 비활성화됐습니다. PayUp 전용 Functions를 사용하세요.",
          httpStatus: 410,
        },
      });
      return;
    }
    await handler(request, response);
  };
}

export const paymentsReady = onRequest(paymentFunctionOptions, guardLegacyMockPayment(paymentsReadyHandler));
export const paymentsConfirm = onRequest(paymentFunctionOptions, guardLegacyMockPayment(paymentsConfirmHandler));
export const paymentsWebhook = onRequest(paymentFunctionOptions, guardLegacyMockPayment(paymentsWebhookHandler));
export const paymentsCancel = onRequest(paymentFunctionOptions, guardLegacyMockPayment(paymentsCancelHandler));
export const paymentsStatus = onRequest(paymentFunctionOptions, guardLegacyMockPayment(paymentsStatusHandler));
export const ordersCreate = onRequest(paymentFunctionOptions, guardLegacyMockPayment(ordersCreateHandler));
export const qrCreate = onRequest(paymentFunctionOptions, guardLegacyMockPayment(qrCreateHandler));
export const qrExpire = onRequest(paymentFunctionOptions, guardLegacyMockPayment(qrExpireHandler));
export const inventoryReserve = onRequest(paymentFunctionOptions, guardLegacyMockPayment(inventoryReserveHandler));
export const inventoryRelease = onRequest(paymentFunctionOptions, guardLegacyMockPayment(inventoryReleaseHandler));
export const a4RoomsSync = onRequest(paymentFunctionOptions, a4RoomsSyncHandler);

export {
  payupAdminFeatureFlagsSecure as payupAdminFeatureFlags,
  payupAdminHealthSecure as payupAdminHealth,
  payupAdminSettlementsSecure as payupAdminSettlements,
  payupAdminSubmerchantsSecure as payupAdminSubmerchants,
  payupAdminTransactionsSecure as payupAdminTransactions,
} from "./payup/adminSecure";
export { payupAdminCancelFinal as payupAdminCancel } from "./payup/cancelFinal";
export { payupAdminLogsSecure as payupAdminLogs } from "./payup/logsSecure";
export { payupPartnerActivitySecure as payupPartnerActivity } from "./payup/partnerSecure";
export {
  payupAdminAccessSecure as payupAdminAccess,
  payupAdminApprovalsSecure as payupAdminApprovals,
} from "./payup/accessSecure";
export { payupAdminPartnerInvite } from "./payup/partnerProvisioning";
export { payupBootstrapAccess } from "./payup/bootstrap";
export { payupAdminDistributionPolicies } from "./payup/distribution";
export { payupQrCreate } from "./payup/qr";
export { payupA5lsHandoff, payupA5lsStatus } from "./payup/channelGateway";
export { payupPaymentOrder } from "./payup/paymentOrder";
export {
  payupExpirePaymentSessions,
  payupMobileAuthReturn,
  payupPaymentAbort,
  payupPaymentApprove,
  payupPaymentStatus,
} from "./payup/paymentApproval";
export { payupOrderPrivateRead } from "./payup/privateOrder";
export { payupPublicOrderRead, payupPublicQrRead } from "./payup/publicRead";
export {
  payupReconcileSettlementsScheduled,
  payupReconcileTransactionsScheduled,
  payupRepairCancelReversalsScheduled,
} from "./payup/reconciliation";
export { tabletDeviceAdmin, tabletDeviceEnroll, tabletDeviceStatus } from "./tablet/device";
