import { onRequest } from "firebase-functions/v2/https";
import { paymentsCancelHandler } from "./payments/cancel";
import { paymentsConfirmHandler } from "./payments/confirm";
import { paymentsReadyHandler } from "./payments/ready";
import { paymentsWebhookHandler } from "./payments/webhook";

const paymentFunctionOptions = {
  region: "asia-northeast3",
  cors: true,
  maxInstances: 10,
};

export const paymentsReady = onRequest(paymentFunctionOptions, paymentsReadyHandler);
export const paymentsConfirm = onRequest(paymentFunctionOptions, paymentsConfirmHandler);
export const paymentsWebhook = onRequest(paymentFunctionOptions, paymentsWebhookHandler);
export const paymentsCancel = onRequest(paymentFunctionOptions, paymentsCancelHandler);
