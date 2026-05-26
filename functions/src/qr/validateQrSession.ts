import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import {
  calculateItemsAmount,
  makeQrSessionId,
  makeShortCode,
  normalizeCartItems,
  readObjectBody,
  requirePost,
  sendJson,
  type HttpRequestLike,
  type HttpResponseLike,
  type QrCreateRequest,
  type QrExpireRequest,
} from "../payments/types";
import { createAuditLogDraft, toAuditLogDocument } from "../utils/auditLog";
import { getQrTransactionPlan } from "../utils/firestoreTransaction";

export type QrSessionValidationInput = {
  qrSessionId: string;
  status?: "active" | "paid" | "expired" | "cancelled";
  expiresAt?: string;
};

export type QrSessionValidationResult =
  | { ok: true; qrSessionId: string; checkedAt: string }
  | { ok: false; code: string; message: string; checkedAt: string };

export type FirestoreQrSession = {
  id: string;
  status: string;
  expiresAt?: string;
  shortCode?: string;
  nurseryId?: string;
  roomId?: string;
  tabletId?: string;
  totalAmountSnapshot?: number;
  itemsSnapshot?: unknown;
};

export function validateQrSession(input: QrSessionValidationInput): QrSessionValidationResult {
  const checkedAt = new Date().toISOString();

  if (!input.qrSessionId) {
    return { ok: false, code: "QR_SESSION_REQUIRED", message: "qrSessionId is required.", checkedAt };
  }

  if (input.status && input.status !== "active") {
    return {
      ok: false,
      code: "QR_SESSION_NOT_ACTIVE",
      message: `QR session is ${input.status}. Payment must be blocked.`,
      checkedAt,
    };
  }

  if (input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now()) {
    return {
      ok: false,
      code: "QR_SESSION_EXPIRED",
      message: "QR session is expired. Create a new QR from tablet.",
      checkedAt,
    };
  }

  return { ok: true, qrSessionId: input.qrSessionId, checkedAt };
}

export async function readQrSession(qrSessionId: string): Promise<FirestoreQrSession | null> {
  const snapshot = await getAdminDb().collection("qr_payment_sessions").doc(qrSessionId).get();

  if (!snapshot.exists) return null;

  const data = snapshot.data() ?? {};
  return {
    id: snapshot.id,
    status: String(data.status ?? "unknown"),
    expiresAt: toIsoString(data.expires_at ?? data.expiresAt),
    shortCode: optionalString(data.short_code ?? data.shortCode),
    nurseryId: optionalString(data.nursery_id ?? data.nurseryId),
    roomId: optionalString(data.room_id ?? data.roomId),
    tabletId: optionalString(data.tablet_id ?? data.tabletId),
    totalAmountSnapshot: typeof data.total_amount_snapshot === "number" ? data.total_amount_snapshot : undefined,
    itemsSnapshot: data.items_snapshot ?? data.itemsSnapshot,
  };
}

export async function validateFirestoreQrSession(qrSessionId: string): Promise<QrSessionValidationResult & { session?: FirestoreQrSession }> {
  const session = await readQrSession(qrSessionId);

  if (!session) {
    return {
      ok: false,
      code: "QR_SESSION_NOT_FOUND",
      message: "QR session document was not found.",
      checkedAt: new Date().toISOString(),
    };
  }

  const validation = validateQrSession({
    qrSessionId,
    status: normalizeQrStatus(session.status),
    expiresAt: session.expiresAt,
  });

  return validation.ok ? { ...validation, session } : validation;
}

export async function qrCreateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<QrCreateRequest>(request);
  const items = normalizeCartItems(body.items);
  const nurseryId = String(body.nurseryId ?? "");
  const roomId = String(body.roomId ?? "");
  const tabletId = String(body.tabletId ?? "");

  if (!nurseryId || !roomId || !tabletId || items.length === 0) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "QR_CREATE_INPUT_INVALID",
        message: "nurseryId, roomId, tabletId, and at least one item are required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const now = new Date();
  const shortCode = String(body.shortCode ?? makeShortCode("SANHO", now));
  const qrSessionId = makeQrSessionId(shortCode, now);
  const expiresInMinutes = clampNumber(Number(body.expiresInMinutes ?? 180), 5, 24 * 60);
  const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString();
  const totalAmount = calculateItemsAmount(items);

  if (typeof body.clientAmount === "number" && body.clientAmount !== totalAmount) {
    sendJson(response, 409, {
      ok: false,
      error: {
        code: "QR_CREATE_AMOUNT_MISMATCH",
        message: "Client amount does not match QR server snapshot amount.",
        httpStatus: 409,
        details: { clientAmount: body.clientAmount, serverAmount: totalAmount },
      },
    });
    return;
  }

  const db = getAdminDb();
  const auditRef = db.collection("audit_logs").doc();
  const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);

  await db.runTransaction(async (transaction) => {
    transaction.set(qrRef, {
      id: qrSessionId,
      qr_session_id: qrSessionId,
      short_code: shortCode,
      cart_id: body.cartId ?? null,
      nursery_id: nurseryId,
      room_id: roomId,
      tablet_id: tabletId,
      status: "active",
      items_snapshot: items.map(toSnapshotItem),
      total_amount_snapshot: totalAmount,
      currency: body.currency ?? "KRW",
      expires_at: expiresAt,
      guest_read_enabled: true,
      source: "firebase_functions_qr_create",
      demo_read_enabled: true,
      created_at: now.toISOString(),
      updated_at: FieldValue.serverTimestamp(),
    });

    transaction.set(
      auditRef,
      {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: "qr_session_create",
            target: qrSessionId,
            severity: "info",
            message: "QR payment session created by Firebase Functions.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      },
    );
  });

  sendJson(response, 200, {
    ok: true,
    qrSessionId,
    shortCode,
    status: "active",
    expiresAt,
    totalAmount,
    firestoreTransactionPlan: getQrTransactionPlan(),
    message: "QR session created in beta server flow. Direct client writes remain blocked.",
  });
}

export async function qrExpireHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<QrExpireRequest>(request);
  const qrSessionId = String(body.qrSessionId ?? "");

  if (!qrSessionId) {
    sendJson(response, 400, {
      ok: false,
      error: {
        code: "QR_EXPIRE_INPUT_INVALID",
        message: "qrSessionId is required.",
        httpStatus: 400,
      },
    });
    return;
  }

  const db = getAdminDb();
  const qrRef = db.collection("qr_payment_sessions").doc(qrSessionId);
  const auditRef = db.collection("audit_logs").doc();
  let newStatus = "expired";

  await db.runTransaction(async (transaction) => {
    const qrSnapshot = await transaction.get(qrRef);

    if (!qrSnapshot.exists) {
      throw new Error("QR_SESSION_NOT_FOUND");
    }

    const status = String(qrSnapshot.get("status") ?? "");
    if (status === "paid") {
      newStatus = "paid";
      return;
    }

    if (status === "cancelled") {
      newStatus = "cancelled";
      return;
    }

    transaction.set(
      qrRef,
      {
        status: "expired",
        expired_reason: body.reason ?? "manual_or_scheduler_expire",
        expired_at: new Date().toISOString(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    transaction.set(
      auditRef,
      {
        ...toAuditLogDocument(
          createAuditLogDraft({
            action: "qr_session_expire",
            target: qrSessionId,
            severity: "info",
            message: "QR session expired by Firebase Functions.",
          }),
        ),
        updated_at: FieldValue.serverTimestamp(),
      },
    );
  });

  sendJson(response, 200, {
    ok: newStatus === "expired",
    qrSessionId,
    status: newStatus,
    message: newStatus === "expired" ? "QR session expired." : "QR session was not changed because it is already terminal.",
  });
}

function normalizeQrStatus(value: string): QrSessionValidationInput["status"] {
  return value === "paid" || value === "expired" || value === "cancelled" ? value : "active";
}

function toSnapshotItem(item: ReturnType<typeof normalizeCartItems>[number]) {
  return {
    product_id: item.productId,
    option_id: item.optionId ?? null,
    product_name: item.productName,
    option_name: item.optionName,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    company_id: item.companyId,
    line_amount: item.unitPrice * item.quantity,
  };
}

function toIsoString(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === "function") return maybeTimestamp.toDate().toISOString();
    if (typeof maybeTimestamp.seconds === "number") return new Date(maybeTimestamp.seconds * 1000).toISOString();
  }

  return undefined;
}

function optionalString(value: unknown): string | undefined {
  const text = String(value ?? "").trim();
  return text ? text : undefined;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
