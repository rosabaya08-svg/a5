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

const paymentFunctionOptions = {
  region: "asia-northeast3",
  cors: true,
  maxInstances: 10,
};

export const paymentsReady = onRequest(paymentFunctionOptions, paymentsReadyHandler);
export const paymentsConfirm = onRequest(paymentFunctionOptions, paymentsConfirmHandler);
export const paymentsWebhook = onRequest(paymentFunctionOptions, paymentsWebhookHandler);
export const paymentsCancel = onRequest(paymentFunctionOptions, paymentsCancelHandler);
export const paymentsStatus = onRequest(paymentFunctionOptions, paymentsStatusHandler);
export const ordersCreate = onRequest(paymentFunctionOptions, ordersCreateHandler);
export const qrCreate = onRequest(paymentFunctionOptions, qrCreateHandler);
export const qrExpire = onRequest(paymentFunctionOptions, qrExpireHandler);
export const inventoryReserve = onRequest(paymentFunctionOptions, inventoryReserveHandler);
export const inventoryRelease = onRequest(paymentFunctionOptions, inventoryReleaseHandler);
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
export { payupBootstrapAccess } from "./payup/bootstrap";
export { payupAdminDistributionPolicies } from "./payup/distribution";
export { payupQrCreate } from "./payup/qr";
export { payupPaymentOrder } from "./payup/paymentOrder";
export {
  payupExpirePaymentSessions,
  payupMobileAuthReturn,
  payupPaymentAbort,
  payupPaymentApprove,
  payupPaymentStatus,
} from "./payup/paymentApproval";
export { payupOrderPrivateRead } from "./payup/privateOrder";
export {
  payupReconcileSettlementsScheduled,
  payupReconcileTransactionsScheduled,
  payupRepairCancelReversalsScheduled,
} from "./payup/reconciliation";
