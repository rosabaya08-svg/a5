import { createHash, timingSafeEqual } from "crypto";
import type { HttpRequestLike, HttpResponseLike } from "../../payments/types";
import { sendJson } from "../../payments/types";
import type { IntegrationAuthContext, IntegrationPlatformType } from "./types";
import { getAdminDb } from "../../firebaseAdmin";

export async function readIntegrationAuth(
  request: HttpRequestLike,
  response: HttpResponseLike,
  platformType: IntegrationPlatformType,
  body: Record<string, unknown> = {},
  requiredScope?: string,
): Promise<IntegrationAuthContext | undefined> {
  const logContext = createIntegrationLogContext(request, requiredScope);
  const companyId = firstText(
    request.get?.("x-a5-company-id"),
    request.get?.("X-A5-Company-Id"),
    body.companyId,
    body.company_id,
  );
  const apiKey = firstText(request.get?.("x-a5-api-key"), request.get?.("X-A5-API-Key"));

  if (!companyId) {
    await appendIntegrationCallLog({
      companyId: "missing",
      platformType,
      status: "rejected",
      errorCode: "COMPANY_ID_MISSING",
      httpStatus: 400,
      ...logContext,
    });
    sendJson(response, 400, {
      ok: false,
      resultCode: 400,
      resultMsg: "companyId or X-A5-Company-Id is required.",
    });
    return undefined;
  }

  if (!apiKey) {
    await appendIntegrationCallLog({ companyId, platformType, status: "rejected", errorCode: "API_KEY_MISSING", httpStatus: 401, ...logContext });
    sendJson(response, 401, {
      ok: false,
      resultCode: 401,
      resultMsg: "X-A5-API-Key is required.",
    });
    return undefined;
  }

  const verification = await verifyIntegrationApiKey({ companyId, apiKey, platformType, requiredScope });
  if (!verification.ok) {
    await appendIntegrationCallLog({ companyId, platformType, status: "rejected", errorCode: verification.code, httpStatus: 403, ...logContext });
    sendJson(response, 403, {
      ok: false,
      resultCode: 403,
      resultMsg: verification.message,
    });
    return undefined;
  }

  await appendIntegrationCallLog({ companyId, platformType, status: "accepted", apiKeyId: verification.apiKeyId, ...logContext });

  return { companyId, apiKey, platformType, logContext };
}

export async function appendIntegrationCallLog(input: {
  companyId: string;
  platformType: IntegrationPlatformType;
  status: "accepted" | "rejected" | "success" | "failed";
  endpoint?: string;
  apiKeyId?: string;
  errorCode?: string;
  resultCount?: number;
  requestId?: string;
  startedAt?: number;
  latencyMs?: number;
  method?: string;
  path?: string;
  requiredScope?: string;
  httpStatus?: number;
  userAgent?: string;
  remoteIp?: string;
  eventId?: string;
  orderNo?: string;
  message?: string;
}) {
  try {
    const latencyMs = input.latencyMs ?? (input.startedAt ? Date.now() - input.startedAt : null);
    await getAdminDb().collection("integration_call_logs").doc().set({
      company_id: input.companyId,
      platform_type: input.platformType,
      endpoint: input.endpoint ?? null,
      api_key_id: input.apiKeyId ?? null,
      status: input.status,
      error_code: input.errorCode ?? null,
      result_count: input.resultCount ?? null,
      request_id: input.requestId ?? createRequestId(),
      latency_ms: latencyMs,
      method: input.method ?? null,
      path: input.path ?? input.endpoint ?? null,
      required_scope: input.requiredScope ?? null,
      http_status: input.httpStatus ?? null,
      user_agent: input.userAgent ?? null,
      remote_ip: maskIp(input.remoteIp),
      event_id: input.eventId ?? null,
      order_no: input.orderNo ?? null,
      message: input.message ?? null,
      demo_read_enabled: true,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Logging must never block the external integration response.
  }
}

export function createIntegrationLogContext(request: HttpRequestLike, requiredScope?: string) {
  const requestRecord = request as HttpRequestLike & {
    originalUrl?: string;
    url?: string;
    path?: string;
    ip?: string;
    socket?: { remoteAddress?: string };
  };

  return {
    requestId: firstText(request.get?.("x-a5-request-id"), request.get?.("x-request-id"), createRequestId()),
    startedAt: Date.now(),
    method: firstText(request.method, "UNKNOWN"),
    path: firstText(requestRecord.originalUrl, requestRecord.url, requestRecord.path, ""),
    requiredScope,
    userAgent: firstText(request.get?.("user-agent"), request.get?.("User-Agent")),
    remoteIp: firstText(request.get?.("x-forwarded-for"), request.get?.("X-Forwarded-For"), requestRecord.ip, requestRecord.socket?.remoteAddress),
  };
}

async function verifyIntegrationApiKey(input: {
  companyId: string;
  apiKey: string;
  platformType: IntegrationPlatformType;
  requiredScope?: string;
}): Promise<{ ok: true; apiKeyId: string } | { ok: false; code: string; message: string }> {
  const keyHash = hashApiKey(input.apiKey);
  const snapshot = await getAdminDb()
    .collection("integration_api_keys")
    .where("company_id", "==", input.companyId)
    .where("key_hash", "==", keyHash)
    .limit(1)
    .get();
  const doc = snapshot.docs[0];

  if (!doc?.exists) {
    return { ok: false, code: "API_KEY_INVALID", message: "API key is invalid." };
  }

  const data = doc.data();
  const status = String(data.status ?? "");
  const platformType = String(data.platform_type ?? "");

  if (status !== "active") {
    return { ok: false, code: "API_KEY_INACTIVE", message: "API key is not active." };
  }

  if (platformType && platformType !== input.platformType && platformType !== "ALL") {
    return { ok: false, code: "API_KEY_SCOPE_MISMATCH", message: "API key is not allowed for this integration track." };
  }

  const scopes = Array.isArray(data.scopes) ? data.scopes.map((scope) => String(scope)) : [];
  if (input.requiredScope && !scopes.includes(input.requiredScope)) {
    return { ok: false, code: "API_KEY_SCOPE_MISMATCH", message: "API key does not include the required scope." };
  }

  if (!safeEqual(keyHash, String(data.key_hash ?? ""))) {
    return { ok: false, code: "API_KEY_INVALID", message: "API key is invalid." };
  }

  await doc.ref.set({ last_used_at: new Date().toISOString() }, { merge: true });
  return { ok: true, apiKeyId: doc.id };
}

function hashApiKey(apiKey: string) {
  return createHash("sha256").update(apiKey).digest("hex");
}

function safeEqual(left: string, right: string) {
  try {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  } catch {
    return false;
  }
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }

  return "";
}

function createRequestId() {
  return `int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function maskIp(value: unknown) {
  const ip = firstText(value).split(",")[0]?.trim() ?? "";
  if (!ip) return null;
  const ipv4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipv4) return `${ipv4[1]}.${ipv4[2]}.${ipv4[3]}.*`;
  const parts = ip.split(":").filter(Boolean);
  return parts.length > 2 ? `${parts.slice(0, 3).join(":")}:*` : ip;
}

