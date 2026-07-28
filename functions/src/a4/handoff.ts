import { createHash, randomBytes } from "crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../payments/types";

type A4HandoffBody = {
  handoffId?: string;
  token?: string;
  handoffToken?: string;
  nurseryId?: string;
  nursery_id?: string;
  roomId?: string;
  room_id?: string;
  tabletId?: string;
  tablet_id?: string;
  businessRegistrationNo?: string;
  business_registration_no?: string;
  externalNurseryId?: string;
  external_nursery_id?: string;
  returnPath?: string;
  targetUrl?: string;
  expiresInMinutes?: number;
  consentAccepted?: boolean;
  consent?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
};

type A4HandoffSession = {
  handoff_id: string;
  token_hash: string;
  nursery_id: string;
  room_id: string;
  tablet_id: string;
  business_registration_no: string;
  external_nursery_id: string;
  source: string;
  status: string;
  consent_status: string;
  return_path: string;
  target_url: string;
  expires_at?: Timestamp;
  consumed_at?: Timestamp;
  metadata?: Record<string, unknown>;
};

type ResponseWithHeaders = HttpResponseLike & {
  set?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
  header?: (field: string | Record<string, string>, value?: string) => HttpResponseLike;
};

const collectionName = "a4_handoff_sessions";
const eventCollectionName = "a4_handoff_events";
const defaultExpiryMinutes = 60;

export async function a4HandoffCreateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  setCorsHeaders(response);
  if (handleOptions(request, response)) return;
  if (!requirePostForHandoff(request, response)) return;

  const body = readObjectBody<A4HandoffBody>(request);
  const nurseryId = text(body.nurseryId ?? body.nursery_id);
  const authorization = await authorizeHandoff(request, nurseryId);
  if (!authorization.ok) {
    sendJson(response, 403, {
      ok: false,
      error: { code: "A4_HANDOFF_FORBIDDEN", message: authorization.reason, httpStatus: 403 },
    });
    return;
  }

  if (!nurseryId) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "A4_HANDOFF_NURSERY_REQUIRED", message: "nurseryId is required.", httpStatus: 400 },
    });
    return;
  }

  const token = makeToken();
  const handoffId = text(body.handoffId) || `a4-handoff-${Date.now()}-${randomBytes(4).toString("hex")}`;
  const expiresAt = new Date(Date.now() + expiryMinutes(body.expiresInMinutes) * 60 * 1000);
  const targetUrl = safePath(text(body.targetUrl)) || safePath(text(body.returnPath)) || "/m/shop/";

  const session: A4HandoffSession = {
    handoff_id: handoffId,
    token_hash: hashToken(token),
    nursery_id: nurseryId,
    room_id: text(body.roomId ?? body.room_id),
    tablet_id: text(body.tabletId ?? body.tablet_id),
    business_registration_no: normalizeBusinessNo(body.businessRegistrationNo ?? body.business_registration_no),
    external_nursery_id: text(body.externalNurseryId ?? body.external_nursery_id),
    source: text(body.source) || "a4",
    status: "created",
    consent_status: "pending",
    return_path: safePath(text(body.returnPath)),
    target_url: targetUrl,
    expires_at: Timestamp.fromDate(expiresAt),
    metadata: objectValue(body.metadata),
  };

  const db = getAdminDb();
  await db.collection(collectionName).doc(handoffId).set({
    ...session,
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
    actor: authorization.actor,
  });
  await writeEvent(handoffId, "created", authorization.actor);

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions",
    handoffId,
    handoffToken: token,
    expiresAt: expiresAt.toISOString(),
    consentUrl: `/a4/handoff/consent?handoffId=${encodeURIComponent(handoffId)}&token=${encodeURIComponent(token)}`,
    consumeUrl: `/a4/handoff/consume?handoffId=${encodeURIComponent(handoffId)}&token=${encodeURIComponent(token)}`,
    targetUrl,
  });
}

export async function a4HandoffConsentHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  setCorsHeaders(response);
  if (handleOptions(request, response)) return;
  if (!requirePostForHandoff(request, response)) return;

  const body = readObjectBody<A4HandoffBody>(request);
  const handoffId = text(body.handoffId ?? request.query?.handoffId);
  const token = text(body.handoffToken ?? body.token ?? request.query?.token);
  const accepted = body.consentAccepted === true || body.consent === true;
  const sessionResult = await readSessionByToken(handoffId, token);

  if (!sessionResult.ok) {
    sendJson(response, sessionResult.httpStatus, {
      ok: false,
      error: { code: sessionResult.code, message: sessionResult.message, httpStatus: sessionResult.httpStatus },
    });
    return;
  }

  await sessionResult.ref.set(
    {
      consent_status: accepted ? "accepted" : "rejected",
      consent_at: FieldValue.serverTimestamp(),
      status: accepted ? "consent_accepted" : "consent_rejected",
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeEvent(handoffId, accepted ? "consent_accepted" : "consent_rejected", "token");

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions",
    handoffId,
    consentAccepted: accepted,
    status: accepted ? "consent_accepted" : "consent_rejected",
  });
}

export async function a4HandoffConsumeHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  setCorsHeaders(response);
  if (handleOptions(request, response)) return;

  const body = readObjectBody<A4HandoffBody>(request);
  const handoffId = text(body.handoffId ?? request.query?.handoffId);
  const token = text(body.handoffToken ?? body.token ?? request.query?.token);
  const sessionResult = await readSessionByToken(handoffId, token);

  if (!sessionResult.ok) {
    sendJson(response, sessionResult.httpStatus, {
      ok: false,
      error: { code: sessionResult.code, message: sessionResult.message, httpStatus: sessionResult.httpStatus },
    });
    return;
  }

  const data = sessionResult.data;
  if (data.consent_status === "rejected") {
    sendJson(response, 409, {
      ok: false,
      error: { code: "A4_HANDOFF_CONSENT_REJECTED", message: "A4 handoff consent was rejected.", httpStatus: 409 },
    });
    return;
  }

  await sessionResult.ref.set(
    {
      status: "consumed",
      consumed_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await writeEvent(handoffId, "consumed", "token");

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions",
    handoffId,
    status: "consumed",
    nurseryId: data.nursery_id,
    roomId: data.room_id,
    tabletId: data.tablet_id,
    businessRegistrationNo: data.business_registration_no,
    targetUrl: data.target_url || "/m/shop/",
  });
}

function setCorsHeaders(response: HttpResponseLike) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-A5-Client, X-A5-Beta-Room-Sync",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
  const withHeaders = response as ResponseWithHeaders;

  if (typeof withHeaders.set === "function") {
    withHeaders.set(headers);
    return;
  }

  if (typeof withHeaders.header === "function") {
    withHeaders.header(headers);
  }
}

function handleOptions(request: HttpRequestLike, response: HttpResponseLike) {
  if (request.method !== "OPTIONS") return false;
  response.status(204).send?.("");
  return true;
}

function requirePostForHandoff(request: HttpRequestLike, response: HttpResponseLike) {
  if (request.method === "POST") return true;
  sendJson(response, 405, {
    ok: false,
    error: { code: "METHOD_NOT_ALLOWED", message: "Use POST for A4 handoff mutations.", httpStatus: 405 },
  });
  return false;
}

async function authorizeHandoff(request: HttpRequestLike, nurseryId: string) {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (token) {
    try {
      const decoded = await getAdminAuth().verifyIdToken(token);
      const role = String(decoded.role ?? "");
      const tokenNurseryId = String(decoded.nursery_id ?? decoded.nurseryId ?? "");
      if (role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true) {
        return { ok: true as const, actor: role || "seed_admin" };
      }
      if (role === "NURSERY_ADMIN" && nurseryId && tokenNurseryId === nurseryId) {
        return { ok: true as const, actor: role };
      }
    } catch {
      return { ok: false as const, reason: "Firebase ID token verification failed." };
    }
  }

  const betaHeader = request.get?.("x-a5-beta-room-sync") ?? request.get?.("X-A5-Beta-Room-Sync") ?? "";
  if (process.env.A5_ALLOW_BETA_ROOM_SYNC === "true" && betaHeader === "enabled") {
    return { ok: true as const, actor: "beta_handoff" };
  }

  return { ok: false as const, reason: "A4 handoff requires SUPER_ADMIN/NURSERY_ADMIN Firebase claims." };
}

async function readSessionByToken(handoffId: string, token: string) {
  if (!handoffId || !token) {
    return {
      ok: false as const,
      httpStatus: 400,
      code: "A4_HANDOFF_TOKEN_REQUIRED",
      message: "handoffId and token are required.",
    };
  }

  const ref = getAdminDb().collection(collectionName).doc(handoffId);
  const snapshot = await ref.get();
  if (!snapshot.exists) {
    return {
      ok: false as const,
      httpStatus: 404,
      code: "A4_HANDOFF_NOT_FOUND",
      message: "A4 handoff session was not found.",
    };
  }

  const data = snapshot.data() as A4HandoffSession;
  if (data.token_hash !== hashToken(token)) {
    return {
      ok: false as const,
      httpStatus: 403,
      code: "A4_HANDOFF_TOKEN_INVALID",
      message: "A4 handoff token is invalid.",
    };
  }

  if (data.expires_at?.toDate && data.expires_at.toDate().getTime() < Date.now()) {
    return {
      ok: false as const,
      httpStatus: 410,
      code: "A4_HANDOFF_EXPIRED",
      message: "A4 handoff session expired.",
    };
  }

  return { ok: true as const, ref, data };
}

async function writeEvent(handoffId: string, action: string, actor: string) {
  await getAdminDb().collection(eventCollectionName).doc(`${handoffId}-${action}-${Date.now()}`).set({
    handoff_id: handoffId,
    action,
    actor,
    created_at: FieldValue.serverTimestamp(),
  });
}

function makeToken() {
  return randomBytes(24).toString("base64url");
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function expiryMinutes(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultExpiryMinutes;
  return Math.min(24 * 60, Math.round(parsed));
}

function normalizeBusinessNo(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function safePath(value: string) {
  if (!value) return "";
  if (value.startsWith("https://") || value.startsWith("/")) return value;
  return "";
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}
