import { createHash, randomUUID } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { getAdminDb } from "../firebaseAdmin";
import { AccessHttpError, safeDocumentId, text, type AccessActor } from "../access/policy";

export const PAYUP_API_KEY = defineSecret("PAYUP_API_KEY");
export const PAYUP_API_CERT_KEY = defineSecret("PAYUP_API_CERT_KEY");
export const ORDER_PII_ENCRYPTION_KEY = defineSecret("A5_ORDER_PII_ENCRYPTION_KEY");

const REQUEST_TIMEOUT_MS = 12_000;
const PAYUP_TEST_BASE_URL = "https://api.testpayup.co.kr";
const PAYUP_PRODUCTION_BASE_URL = "https://api.payup.co.kr";

export type PayupRuntime = {
  environment: "test" | "production";
  mode: "sandbox" | "test" | "production";
  baseUrl: string;
  merchantId: string;
  apiKey: string;
  apiCertKey: string;
  liveCallsEnabled: boolean;
  fixedIpRegistered: boolean;
  vpcConnector: string;
  fixedEgressIp: string;
  authReturnUrl: string;
  successReturnUrl: string;
  failureReturnUrl: string;
  orderPiiEncryptionKey: string;
};

type JsonRecord = Record<string, unknown>;

function boolEnv(name: string): boolean {
  return String(process.env[name] ?? "").trim().toLowerCase() === "true";
}

function validIpv4(value: string): boolean {
  const parts = value.split(".");
  return parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255);
}

export function getPayupRuntime(): PayupRuntime {
  const environment = process.env.PAYUP_ENVIRONMENT === "production" ? "production" : "test";
  const liveCallsEnabled = boolEnv("PAYUP_LIVE_CALLS_ENABLED");
  return {
    environment,
    mode: liveCallsEnabled ? environment : "sandbox",
    baseUrl: environment === "production" ? PAYUP_PRODUCTION_BASE_URL : PAYUP_TEST_BASE_URL,
    merchantId: text(process.env.PAYUP_MERCHANT_ID, 100),
    apiKey: text(PAYUP_API_KEY.value(), 200),
    apiCertKey: text(PAYUP_API_CERT_KEY.value(), 200),
    liveCallsEnabled,
    fixedIpRegistered: boolEnv("PAYUP_FIXED_IP_REGISTERED"),
    vpcConnector: text(process.env.PAYUP_VPC_CONNECTOR, 200),
    fixedEgressIp: text(process.env.PAYUP_FIXED_EGRESS_IP, 100),
    authReturnUrl: text(process.env.PAYUP_AUTH_RETURN_URL, 500),
    successReturnUrl: text(process.env.PAYUP_SUCCESS_RETURN_URL, 500),
    failureReturnUrl: text(process.env.PAYUP_FAILURE_RETURN_URL, 500),
    orderPiiEncryptionKey: text(ORDER_PII_ENCRYPTION_KEY.value(), 500),
  };
}

export function runtimeBlockers(
  config: PayupRuntime,
  options: { requireApiCertKey?: boolean; requireAuthReturn?: boolean; requirePiiKey?: boolean } = {},
): string[] {
  const blockers: string[] = [];
  if (!config.merchantId) blockers.push("PAYUP_MERCHANT_ID 미등록");
  if (!config.apiKey) blockers.push("PAYUP_API_KEY Secret 미등록");
  if (options.requireApiCertKey && !config.apiCertKey) blockers.push("PAYUP_API_CERT_KEY Secret 미등록");
  if (options.requirePiiKey && (!config.orderPiiEncryptionKey || config.orderPiiEncryptionKey.length < 32)) blockers.push("A5_ORDER_PII_ENCRYPTION_KEY Secret 미등록 또는 32자 미만");
  if (config.environment === "production") {
    if (!config.vpcConnector) blockers.push("PAYUP_VPC_CONNECTOR 미등록");
    if (!config.fixedEgressIp || !validIpv4(config.fixedEgressIp)) blockers.push("PAYUP_FIXED_EGRESS_IP 미등록 또는 IPv4 형식 오류");
    if (!config.fixedIpRegistered) blockers.push("PayUp 운영 허용 공인 IP 미확인");
  }
  if (!config.liveCallsEnabled) blockers.push("PAYUP_LIVE_CALLS_ENABLED=false");
  if (options.requireAuthReturn && !config.authReturnUrl) blockers.push("PAYUP_AUTH_RETURN_URL 미등록");
  return blockers;
}

export function assertRuntimeReady(config: PayupRuntime, options: { requireApiCertKey?: boolean; requireAuthReturn?: boolean; requirePiiKey?: boolean } = {}) {
  const blockers = runtimeBlockers(config, options);
  if (blockers.length) throw new AccessHttpError(409, "PAYUP_CONFIGURATION_BLOCKED", blockers.join(", "));
}

export function sha256(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function maskIdentifier(value: string): string {
  if (!value) return "미등록";
  if (value.length <= 6) return `${value.slice(0, 2)}***`;
  return `${value.slice(0, 4)}***${value.slice(-3)}`;
}

export function maskIp(value: string): string {
  if (!validIpv4(value)) return "미등록";
  const parts = value.split(".");
  return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
}

export function timestampToken(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

export function validatePayupUrl(urlValue: string, runtime: PayupRuntime): URL {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new AccessHttpError(400, "PAYUP_URL_INVALID", "PayUp URL 형식이 올바르지 않습니다.");
  }
  const expectedHost = new URL(runtime.baseUrl).host;
  if (url.protocol !== "https:" || url.host !== expectedHost) throw new AccessHttpError(409, "PAYUP_URL_HOST_BLOCKED", "PayUp 공식 API 도메인이 아닌 URL은 호출할 수 없습니다.");
  return url;
}

export async function featureFlagEnabled(key: string): Promise<boolean> {
  const snapshot = await getAdminDb().doc(`payment_feature_flags/payup_${safeDocumentId(key)}`).get();
  return snapshot.exists && snapshot.data()?.enabled === true;
}

export async function assertFeatureFlags(keys: string[]) {
  const states = await Promise.all(keys.map(async (key) => ({ key, enabled: await featureFlagEnabled(key) })));
  const disabled = states.filter((state) => !state.enabled).map((state) => state.key);
  if (disabled.length) throw new AccessHttpError(409, "PAYUP_CIRCUIT_OFF", `PayUp 회로가 OFF입니다: ${disabled.join(", ")}`);
}

export async function writeIntegrationLog(input: {
  actor?: AccessActor;
  operation: string;
  path: string;
  correlationId?: string;
  responseCode: string;
  responseMsg: string;
  status: "success" | "failed" | "blocked" | "sandbox";
  merchantId?: string;
  subMerchantId?: string;
  orderNumber?: string;
  transactionId?: string;
}) {
  const correlationId = input.correlationId ?? randomUUID();
  await getAdminDb().collection("payup_integration_logs").add({
    actor_uid: input.actor?.uid ?? "system",
    actor_email: input.actor?.email ?? "",
    actor_roles: input.actor?.roles ?? [],
    operation: input.operation,
    path: input.path,
    merchant_id_masked: maskIdentifier(input.merchantId ?? ""),
    sub_merchant_id: input.subMerchantId ?? null,
    order_number: input.orderNumber ?? null,
    transaction_id: input.transactionId ?? null,
    response_code: input.responseCode,
    response_msg: input.responseMsg.slice(0, 500),
    status: input.status,
    correlation_id: correlationId,
    secrets_redacted: true,
    created_at: FieldValue.serverTimestamp(),
    created_at_iso: new Date().toISOString(),
  });
  return correlationId;
}

export async function postPayup(input: {
  config: PayupRuntime;
  actor?: AccessActor;
  operation: string;
  pathOrUrl: string;
  payload: JsonRecord;
  correlationId?: string;
  subMerchantId?: string;
  orderNumber?: string;
  transactionId?: string;
  requireApiCertKey?: boolean;
}): Promise<JsonRecord> {
  assertRuntimeReady(input.config, { requireApiCertKey: input.requireApiCertKey });
  const url = input.pathOrUrl.startsWith("https://") ? validatePayupUrl(input.pathOrUrl, input.config) : new URL(input.pathOrUrl, input.config.baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const correlationId = input.correlationId ?? randomUUID();
  let responseCode = "HTTP_ERROR";
  let responseMsg = "PayUp API 호출 실패";
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(input.payload),
      signal: controller.signal,
    });
    const raw = await response.text();
    let parsed: JsonRecord;
    try {
      parsed = JSON.parse(raw) as JsonRecord;
    } catch {
      parsed = { responseCode: `HTTP_${response.status}`, responseMsg: raw.slice(0, 500) };
    }
    responseCode = text(parsed.responseCode, 100) || `HTTP_${response.status}`;
    responseMsg = text(parsed.responseMsg, 500) || `HTTP ${response.status}`;
    await writeIntegrationLog({
      actor: input.actor,
      operation: input.operation,
      path: url.pathname,
      correlationId,
      responseCode,
      responseMsg,
      status: response.ok && responseCode === "0000" ? "success" : "failed",
      merchantId: input.config.merchantId,
      subMerchantId: input.subMerchantId,
      orderNumber: input.orderNumber,
      transactionId: input.transactionId,
    });
    if (!response.ok) throw new AccessHttpError(502, "PAYUP_HTTP_ERROR", `PayUp HTTP ${response.status}: ${responseMsg}`);
    return parsed;
  } catch (error) {
    if (!(error instanceof AccessHttpError)) {
      await writeIntegrationLog({ actor: input.actor, operation: input.operation, path: url.pathname, correlationId, responseCode, responseMsg: error instanceof Error ? error.message : responseMsg, status: "failed", merchantId: input.config.merchantId, subMerchantId: input.subMerchantId, orderNumber: input.orderNumber, transactionId: input.transactionId });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
