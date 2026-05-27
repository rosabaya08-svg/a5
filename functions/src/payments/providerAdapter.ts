import { createHmac, timingSafeEqual } from "crypto";
import { getAdminDb } from "../firebaseAdmin";
import { getPgServerReadiness } from "./providerRuntime";
import type { PaymentProviderId, PgApproval } from "./types";

export type PgProviderCandidate = "infiny" | "toss" | "portone" | "kcp" | "nice" | "unknown";

export type PgProviderOperation =
  | "createPaymentIntent"
  | "requestPayment"
  | "confirmPayment"
  | "handleWebhook"
  | "cancelPayment"
  | "refundPayment";

export type PgProviderAdapterSlot = {
  provider: PaymentProviderId;
  candidate: PgProviderCandidate;
  enabled: boolean;
  publicKeys: string[];
  serverSecrets: string[];
  endpointKeys: string[];
  blockedOperations: string[];
  supportedCandidates: Exclude<PgProviderCandidate, "unknown">[];
  operationPlan: Record<PgProviderOperation, string>;
  handoff: string[];
};

export type ProviderCreateIntentInput = {
  paymentIntentId: string;
  orderNo: string;
  orderName: string;
  amount: number;
  currency: "KRW";
  successUrl?: string;
  failUrl?: string;
};

export type ProviderRequestInput = ProviderCreateIntentInput & {
  clientKey?: string;
  channelKey?: string;
};

export type ProviderConfirmInput = {
  paymentIntentId: string;
  orderNo: string;
  amount: number;
  companyId?: string;
  merchantId?: string;
  merchantSerialNo?: string;
  moduleKey?: string;
  terminalId?: string;
  secretKey?: string;
  merchantPassword?: string;
  signKey?: string;
  secretKeyRef?: string;
  merchantPasswordRef?: string;
  signKeyRef?: string;
  providerPaymentKey?: string;
  transactionId?: string;
  receiptUrl?: string;
};

export type ProviderWebhookInput = {
  eventId: string;
  signature?: string;
  rawBody: string;
  headers?: Record<string, string | undefined>;
};

export type ProviderCancelInput = {
  orderNo: string;
  paymentKey?: string;
  amount: number;
  reason: string;
};

export type ProviderRefundInput = ProviderCancelInput & {
  refundReasonCode?: string;
};

export type ProviderBlockedResult = {
  ok: false;
  code: string;
  message: string;
  candidate: PgProviderCandidate;
  operation: PgProviderOperation;
  realPgCalled: false;
};

export type ProviderConfirmResult =
  | { ok: true; approval: PgApproval; candidate: PgProviderCandidate; operation: "confirmPayment"; realPgCalled: boolean }
  | ProviderBlockedResult;

export type ProviderActionResult =
  | {
      ok: true;
      candidate: PgProviderCandidate;
      operation: "handleWebhook" | "cancelPayment" | "refundPayment" | "getPaymentStatus";
      realPgCalled: boolean;
      paymentKey?: string;
      transactionId?: string;
      status?: string;
      amount?: number;
      message: string;
      raw?: Record<string, unknown>;
    }
  | ProviderBlockedResult;

export function resolveProviderCandidate(value?: string): PgProviderCandidate {
  const provider = String(value ?? "").trim().toLowerCase().replace(/[\s_-]/g, "");

  if (provider === "infiny" || provider === "infini" || provider === "infinypg" || provider === "infinipg") return "infiny";
  if (provider === "toss" || provider === "tosspayments") return "toss";
  if (provider === "portone" || provider === "iamport") return "portone";
  if (provider === "kcp") return "kcp";
  if (provider === "nice" || provider === "nicepay") return "nice";

  return "unknown";
}

export function providerCandidateToId(candidate: PgProviderCandidate): PaymentProviderId {
  if (candidate === "infiny" || candidate === "toss" || candidate === "portone" || candidate === "kcp" || candidate === "nice") return candidate;
  return "pg_contract";
}

export function getProviderAdapterSlot(providerName?: string): PgProviderAdapterSlot {
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(providerName ?? readiness.provider);

  return {
    provider: providerCandidateToId(candidate),
    candidate,
    enabled: readiness.readyForAdapter && candidate !== "unknown",
    publicKeys: ["NEXT_PUBLIC_PG_PROVIDER", "NEXT_PUBLIC_PG_CLIENT_KEY", "NEXT_PUBLIC_PG_SCRIPT_URL", "NEXT_PUBLIC_PG_REQUEST_FUNCTION"],
    serverSecrets: ["PG_SECRET_KEY", "PG_MERCHANT_ID", "PG_CHANNEL_KEY", "PG_WEBHOOK_SECRET"],
    endpointKeys: ["PG_API_BASE_URL", "PG_CONFIRM_URL", "PG_CANCEL_URL", "PG_STATUS_URL", "PAYMENT_WEBHOOK_URL", "NEXT_PUBLIC_PAYMENT_API_BASE_URL"],
    blockedOperations: readiness.readyForAdapter ? ["real_settlement"] : ["real_approval", "real_cancel", "real_refund", "real_settlement"],
    supportedCandidates: ["infiny", "toss", "portone", "kcp", "nice"],
    operationPlan: {
      createPaymentIntent: "Map A5 order snapshot into provider prepare/request payload after server amount recalculation.",
      requestPayment: "Browser opens the provider module with public client key only.",
      confirmPayment: "Functions calls provider confirm with PG_SECRET_KEY after amount/QR/stock validation.",
      handleWebhook: "Functions verifies PG_WEBHOOK_SECRET signature before any payment state transition.",
      cancelPayment: "Functions calls cancel API only after refund and settlement hold approval.",
      refundPayment: "Interface-only until refund policy, partial refund, and settlement reconciliation are approved.",
    },
    handoff: [
      "Keep PG_SECRET_KEY on Firebase Functions runtime or Secret Manager only.",
      "Do not expose server secrets to Next.js static export or Cloudflare Pages.",
      "Implement official SDK/API call only inside provider adapter after PG contract review.",
      "Keep server amount recalculation before confirmPayment.",
      "Keep webhook idempotency and audit log writes before status transitions.",
    ],
  };
}

export async function createProviderPaymentIntent(input: ProviderCreateIntentInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("createPaymentIntent", "Provider prepare/create intent branch is not wired to a real PG SDK/API yet.");
}

export async function requestProviderPayment(input: ProviderRequestInput): Promise<ProviderBlockedResult> {
  void input;
  return blocked("requestPayment", "Browser PG module loading is prepared but real SDK import/open is not enabled in this server adapter.");
}

export async function confirmPaymentWithConfiguredProvider(input: ProviderConfirmInput): Promise<ProviderConfirmResult> {
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(readiness.provider);
  const rawProvider = readiness.provider.trim().toLowerCase();

  if (rawProvider !== "mock" && candidate === "unknown") {
    return blocked("confirmPayment", `Unknown PG provider ${readiness.provider}. No PG API was called.`);
  }

  if (candidate !== "unknown") {
    if (candidate === "infiny") return confirmInfinyPayment(input);

    return blocked("confirmPayment", `Real ${candidate} confirm adapter is not implemented yet. No PG API was called.`);
  }

  return {
    ok: true,
    candidate,
    operation: "confirmPayment",
    realPgCalled: false,
    approval: {
      provider: "mock",
      status: "approved_mock",
      mockTid: `MOCK-FN-${input.orderNo}`,
      realPgCalled: false,
      approvedAt: new Date().toISOString(),
      message: readiness.readyForAdapter
        ? `${candidate} keys, MID ${input.merchantId ?? "missing"}, and module key ${input.moduleKey ? "resolved" : "missing"} appear ready, but provider adapter is still mock-only. No real PG API was used.`
        : "Mock approval only. No PG secret or real API was used.",
    },
  };
}

async function confirmInfinyPayment(input: ProviderConfirmInput): Promise<ProviderConfirmResult> {
  const runtimeConfig = await readFirestorePgRuntimeConfig();
  const readiness = getPgServerReadiness();
  const endpoint =
    readiness.confirmUrl ||
    runtimeConfig.confirmUrl ||
    readEnv("INFINY_CONFIRM_URL") ||
    joinUrl(runtimeConfig.apiBaseUrl || readEnv("INFINY_API_BASE_URL") || readEnv("PG_API_BASE_URL"), "/payments/confirm");
  const secretKey = input.secretKey || readEnv("PG_SECRET_KEY") || readEnv("INFINY_SECRET_KEY");

  if (!endpoint) {
    return blocked("confirmPayment", "INFINY_CONFIRM_URL or INFINY_API_BASE_URL is missing. No PG API was called.");
  }

  if (!secretKey) {
    return blocked("confirmPayment", "PG_SECRET_KEY is missing from the Functions runtime. No PG API was called.");
  }

  if (!input.merchantId || !input.moduleKey || !input.merchantSerialNo) {
    return blocked("confirmPayment", "Company MID, serial number, or module key is missing. No PG API was called.");
  }

  if (!input.providerPaymentKey && !input.transactionId) {
    return blocked("confirmPayment", "Provider paymentKey or transactionId is missing from the browser PG module result. No PG API was called.");
  }

  const approvedAt = new Date().toISOString();
  const requestBody = {
    provider: "infiny",
    orderNo: input.orderNo,
    paymentIntentId: input.paymentIntentId,
    amount: input.amount,
    currency: "KRW",
    companyId: input.companyId ?? null,
    merchantId: input.merchantId,
    merchantSerialNo: input.merchantSerialNo,
    moduleKey: input.moduleKey,
    terminalId: input.terminalId ?? null,
    credentialRefs: {
      secretKeyRef: input.secretKeyRef ?? null,
      merchantPasswordRef: input.merchantPasswordRef ?? null,
      signKeyRef: input.signKeyRef ?? null,
    },
    merchantPassword: input.merchantPassword ? "__server_supplied__" : null,
    signKey: input.signKey ? "__server_supplied__" : null,
    paymentKey: input.providerPaymentKey ?? null,
    transactionId: input.transactionId ?? null,
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Idempotency-Key": input.paymentIntentId,
        "X-A5-Order-No": input.orderNo,
        "X-A5-Company-Id": input.companyId ?? "",
        "X-A5-Merchant-Id": input.merchantId,
        "X-A5-Merchant-Serial-No": input.merchantSerialNo,
        "X-A5-Module-Key": input.moduleKey,
        "X-A5-Terminal-Id": input.terminalId ?? "",
        "X-A5-Merchant-Password": input.merchantPassword ?? "",
        "X-A5-Sign-Key": input.signKey ?? "",
      },
      body: JSON.stringify(requestBody),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return blocked("confirmPayment", `Infiny confirm returned HTTP ${response.status}: ${String(data.message ?? data.error ?? response.statusText)}`);
    }

    const confirmedAmount = readNumber(data.amount ?? data.approvedAmount ?? data.totalAmount);
    if (typeof confirmedAmount === "number" && confirmedAmount !== input.amount) {
      return blocked("confirmPayment", `Infiny approved amount mismatch. server=${input.amount}, provider=${confirmedAmount}`);
    }

    const paymentKey = readString(data.paymentKey ?? data.payment_key ?? input.providerPaymentKey);
    const transactionId = readString(data.transactionId ?? data.transaction_id ?? data.tid ?? input.transactionId);
    const receiptUrl = readString(data.receiptUrl ?? data.receipt_url ?? input.receiptUrl);

    return {
      ok: true,
      candidate: "infiny",
      operation: "confirmPayment",
      realPgCalled: true,
      approval: {
        provider: "infiny",
        status: "approved",
        mockTid: transactionId || paymentKey || `INFINY-${input.orderNo}`,
        paymentKey,
        transactionId,
        receiptUrl,
        realPgCalled: true,
        approvedAt: readString(data.approvedAt ?? data.approved_at) || approvedAt,
        message: "Infiny payment confirm succeeded through the configured server adapter.",
      },
    };
  } catch (error) {
    return blocked("confirmPayment", error instanceof Error ? error.message : "Unknown Infiny confirm error.");
  }
}

export async function handleProviderWebhook(input: ProviderWebhookInput): Promise<ProviderActionResult> {
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(readiness.provider);
  const secret = readEnv("PG_WEBHOOK_SECRET");

  if (candidate === "unknown" || readiness.provider.trim().toLowerCase() === "mock") {
    return blocked("handleWebhook", "Webhook verification is unavailable while PG_PROVIDER is mock or unknown.");
  }

  if (!secret) {
    return blocked("handleWebhook", "PG_WEBHOOK_SECRET is missing from the Functions runtime.");
  }

  const verified = verifyWebhookSignature({
    rawBody: input.rawBody,
    signature: input.signature,
    secret,
    algorithm: readiness.webhookSignatureAlgorithm,
  });

  if (!verified) {
    return blocked("handleWebhook", "PG webhook signature verification failed.");
  }

  return {
    ok: true,
    candidate,
    operation: "handleWebhook",
    realPgCalled: false,
    message: "PG webhook signature verified.",
  };
}

export async function cancelProviderPayment(input: ProviderCancelInput): Promise<ProviderActionResult> {
  return callProviderPaymentAction("cancelPayment", input);
}

export async function refundProviderPayment(input: ProviderRefundInput): Promise<ProviderActionResult> {
  return callProviderPaymentAction("refundPayment", input);
}

function blocked(operation: PgProviderOperation, message: string): ProviderBlockedResult {
  const readiness = getPgServerReadiness();
  return {
    ok: false,
    code: "PG_PROVIDER_ADAPTER_NOT_IMPLEMENTED",
    message,
    candidate: resolveProviderCandidate(readiness.provider),
    operation,
    realPgCalled: false,
  };
}

function readEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function joinUrl(base: string, path: string): string {
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function readString(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return undefined;
}

async function callProviderPaymentAction(
  operation: "cancelPayment" | "refundPayment",
  input: ProviderCancelInput | ProviderRefundInput,
): Promise<ProviderActionResult> {
  const runtimeConfig = await readFirestorePgRuntimeConfig();
  const readiness = getPgServerReadiness();
  const candidate = resolveProviderCandidate(readiness.provider);
  const endpoint =
    operation === "cancelPayment"
      ? readiness.cancelUrl || runtimeConfig.cancelUrl || readEnv("INFINY_CANCEL_URL") || joinUrl(runtimeConfig.apiBaseUrl || readEnv("INFINY_API_BASE_URL") || readEnv("PG_API_BASE_URL"), "/payments/cancel")
      : readiness.cancelUrl || runtimeConfig.cancelUrl || readEnv("INFINY_REFUND_URL") || readEnv("INFINY_CANCEL_URL") || joinUrl(runtimeConfig.apiBaseUrl || readEnv("INFINY_API_BASE_URL") || readEnv("PG_API_BASE_URL"), "/payments/refund");
  const secretKey = readEnv("PG_SECRET_KEY") || readEnv("INFINY_SECRET_KEY");

  if (candidate === "unknown" || readiness.provider.trim().toLowerCase() === "mock") {
    return blocked(operation, "PG_PROVIDER is mock or unknown. No real cancel/refund API was called.");
  }

  if (!endpoint) {
    return blocked(operation, "PG cancel/refund endpoint is missing. No PG API was called.");
  }

  if (!secretKey) {
    return blocked(operation, "PG_SECRET_KEY is missing from the Functions runtime. No PG API was called.");
  }

  if (!input.paymentKey) {
    return blocked(operation, "paymentKey is required for real PG cancel/refund.");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secretKey}`,
        "Idempotency-Key": `${operation}:${input.orderNo}:${input.amount}`,
        "X-A5-Order-No": input.orderNo,
      },
      body: JSON.stringify({
        provider: candidate,
        orderNo: input.orderNo,
        paymentKey: input.paymentKey,
        amount: input.amount,
        reason: input.reason,
        refundReasonCode: "refundReasonCode" in input ? input.refundReasonCode ?? null : null,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;

    if (!response.ok) {
      return blocked(operation, `PG ${operation} returned HTTP ${response.status}: ${String(data.message ?? data.error ?? response.statusText)}`);
    }

    return {
      ok: true,
      candidate,
      operation,
      realPgCalled: true,
      paymentKey: readString(data.paymentKey ?? data.payment_key ?? input.paymentKey),
      transactionId: readString(data.transactionId ?? data.transaction_id ?? data.tid),
      status: readString(data.status) || (operation === "cancelPayment" ? "cancelled" : "refunded"),
      amount: readNumber(data.amount ?? data.cancelledAmount ?? data.refundedAmount) ?? input.amount,
      message: `PG ${operation} succeeded through the configured provider adapter.`,
      raw: maskProviderPayload(data),
    };
  } catch (error) {
    return blocked(operation, error instanceof Error ? error.message : `Unknown PG ${operation} error.`);
  }
}

type FirestorePgRuntimeConfig = {
  apiBaseUrl: string;
  confirmUrl: string;
  cancelUrl: string;
  statusUrl: string;
};

async function readFirestorePgRuntimeConfig(): Promise<FirestorePgRuntimeConfig> {
  try {
    const db = getAdminDb();
    const providerSnapshot = await db.collection("pg_provider_settings").doc("infiny").get();
    const legacySnapshot = await db.collection("pg_gateway_settings").doc("infiny-pg-runtime").get();
    const data = {
      ...(legacySnapshot.exists ? legacySnapshot.data() ?? {} : {}),
      ...(providerSnapshot.exists ? providerSnapshot.data() ?? {} : {}),
    };

    return {
      apiBaseUrl: readString(data.api_base_url ?? data.apiBaseUrl),
      confirmUrl: readString(data.confirm_url ?? data.confirmUrl),
      cancelUrl: readString(data.cancel_url ?? data.cancelUrl),
      statusUrl: readString(data.status_url ?? data.statusUrl),
    };
  } catch {
    return {
      apiBaseUrl: "",
      confirmUrl: "",
      cancelUrl: "",
      statusUrl: "",
    };
  }
}

function verifyWebhookSignature(input: {
  rawBody: string;
  signature?: string;
  secret: string;
  algorithm: "sha256" | "sha512";
}) {
  const signature = normalizeSignature(input.signature);
  if (!signature || !input.rawBody) return false;

  const expected = createHmac(input.algorithm, input.secret).update(input.rawBody, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signature, "hex");

  return expectedBuffer.length === signatureBuffer.length && timingSafeEqual(expectedBuffer, signatureBuffer);
}

function normalizeSignature(signature?: string): string {
  const value = String(signature ?? "").trim();
  if (!value) return "";
  return value.includes("=") ? value.split("=").pop()!.trim().toLowerCase() : value.toLowerCase();
}

function maskProviderPayload(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (/secret|key|card|password|token/i.test(key)) {
      masked[key] = "[masked]";
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
