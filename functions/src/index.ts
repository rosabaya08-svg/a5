import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { a4NurseryAutoSignupHandler } from "./a4/autoSignupNursery";
import { a4RoomsSyncHandler } from "./a4/syncRooms";
import { inventoryReleaseHandler } from "./inventory/releaseInventory";
import { inventoryReserveHandler } from "./inventory/reserveInventory";
import { ordersCreateHandler } from "./orders/createOrderSnapshot";
import { paymentsCancelHandler } from "./payments/cancel";
import { paymentsConfirmHandler } from "./payments/confirm";
import { adminPgActivationHandler, adminPgConnectionTestHandler, adminPgCredentialSaveHandler } from "./payments/adminPg";
import { paymentsDiagnosticsHandler } from "./payments/diagnostics";
import { paymentsReadyHandler } from "./payments/ready";
import { paymentsStatusHandler } from "./payments/status";
import { paymentsWebhookHandler } from "./payments/webhook";
import { qrCreateHandler, qrExpireHandler } from "./qr/validateQrSession";

const pgSecretKey = defineSecret("PG_SECRET_KEY");
const pgWebhookSecret = defineSecret("PG_WEBHOOK_SECRET");
const pgCredentialEncryptionKey = defineSecret("PG_CREDENTIAL_ENCRYPTION_KEY");

const paymentFunctionOptions = {
  region: "asia-northeast3",
  cors: [/^http:\/\/localhost:\d+$/, /^https:\/\/.*\.pages\.dev$/, "https://with-commerce.pages.dev", "https://a5-closed-mall.pages.dev"],
  maxInstances: 10,
  secrets: [pgSecretKey, pgWebhookSecret, pgCredentialEncryptionKey],
};

export const paymentsReady = onRequest(paymentFunctionOptions, paymentsReadyHandler);
export const paymentsConfirm = onRequest(paymentFunctionOptions, paymentsConfirmHandler);
export const paymentsDiagnostics = onRequest(paymentFunctionOptions, paymentsDiagnosticsHandler);
export const paymentsWebhook = onRequest(paymentFunctionOptions, paymentsWebhookHandler);
export const paymentsCancel = onRequest(paymentFunctionOptions, paymentsCancelHandler);
export const paymentsStatus = onRequest(paymentFunctionOptions, paymentsStatusHandler);
export const adminPgCredentialSave = onRequest(paymentFunctionOptions, adminPgCredentialSaveHandler);
export const adminPgConnectionTest = onRequest(paymentFunctionOptions, adminPgConnectionTestHandler);
export const adminPgActivation = onRequest(paymentFunctionOptions, adminPgActivationHandler);
export const ordersCreate = onRequest(paymentFunctionOptions, ordersCreateHandler);
export const qrCreate = onRequest(paymentFunctionOptions, qrCreateHandler);
export const qrExpire = onRequest(paymentFunctionOptions, qrExpireHandler);
export const inventoryReserve = onRequest(paymentFunctionOptions, inventoryReserveHandler);
export const inventoryRelease = onRequest(paymentFunctionOptions, inventoryReleaseHandler);
export const a4RoomsSync = onRequest(paymentFunctionOptions, a4RoomsSyncHandler);
export const a4NurseryAutoSignup = onRequest(paymentFunctionOptions, a4NurseryAutoSignupHandler);
