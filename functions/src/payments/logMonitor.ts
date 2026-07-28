import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { sendJson, type HttpRequestLike, type HttpResponseLike } from "./types";

type PgLogSeverity = "info" | "warning" | "error";

type PgMonitorLog = {
  id: string;
  source: "live";
  collection: string;
  documentId: string;
  functionName: string;
  step: string;
  severity: PgLogSeverity;
  statusLabel: string;
  title: string;
  summary: string;
  operatorAction: string;
  customerMessage: string;
  developerHint: string;
  createdAt: string;
  orderNo?: string;
  paymentIntentId?: string;
  transactionId?: string;
  amount?: number;
  provider?: string;
  companyId?: string;
  customerMasked?: string;
  technicalRefs: Record<string, string>;
};

type TimestampLike = {
  toDate: () => Date;
};

type RecentSnapshot = {
  collection: string;
  docs: FirebaseFirestore.QueryDocumentSnapshot[];
};

const masterAdminEmail = "rosabaya08@gmail.com";

export async function paymentsLogMonitorHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Use GET for payment log monitoring.",
        httpStatus: 405,
      },
    });
    return;
  }
  if (!(await requireSuperAdmin(request, response))) return;

  const limit = clampNumber(numberFromQuery(request.query?.limit), 20, 5, 80);

  try {
    const db = getAdminDb();
    const snapshots = await Promise.all([
      readRecent(db, "pg_payment_logs", "created_at", limit),
      readRecent(db, "payment_return_traces", "created_at", limit),
      readRecent(db, "payment_events", "created_at", limit),
      readRecent(db, "payments", "created_at", limit),
      readRecent(db, "webhook_events", "created_at", limit),
    ]);
    const logs = snapshots.flatMap(normalizeSnapshot).sort((left, right) => right.createdAt.localeCompare(left.createdAt)).slice(0, limit);

    sendJson(response, 200, {
      ok: true,
      source: "firebase_functions",
      generatedAt: new Date().toISOString(),
      logs,
      collections: snapshots.map((snapshot) => ({
        collection: snapshot.collection,
        count: snapshot.docs.length,
      })),
      message: "Recent PG logs were normalized for super-admin monitoring. Secret values are not returned.",
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "PAYMENT_LOG_MONITOR_READ_FAILED",
        message: error instanceof Error ? error.message : "Unknown payment log monitor read error.",
        httpStatus: 503,
      },
    });
  }
}

async function readRecent(
  db: FirebaseFirestore.Firestore,
  collection: string,
  orderField: string,
  limit: number,
): Promise<RecentSnapshot> {
  try {
    const snapshot = await db.collection(collection).orderBy(orderField, "desc").limit(limit).get();
    return { collection, docs: snapshot.docs };
  } catch {
    const snapshot = await db.collection(collection).limit(limit).get();
    return { collection, docs: snapshot.docs };
  }
}

function normalizeSnapshot(snapshot: RecentSnapshot): PgMonitorLog[] {
  return snapshot.docs.map((doc) => {
    const data = doc.data();

    if (snapshot.collection === "payment_return_traces") {
      return normalizeReturnTrace(doc.id, data);
    }
    if (snapshot.collection === "pg_payment_logs") {
      return normalizePgPaymentLog(doc.id, data);
    }
    if (snapshot.collection === "payment_events") {
      return normalizePaymentEvent(doc.id, data);
    }
    if (snapshot.collection === "webhook_events") {
      return normalizeWebhookEvent(doc.id, data);
    }
    return normalizePaymentLedger(doc.id, data);
  });
}

function normalizePgPaymentLog(documentId: string, data: FirebaseFirestore.DocumentData): PgMonitorLog {
  const status = text(data.status);
  const severity = asSeverity(data.severity);

  return {
    id: `pg-log-${documentId}`,
    source: "live",
    collection: "pg_payment_logs",
    documentId,
    functionName: text(data.function_name) || "pgPaymentPipeline",
    step: text(data.step) || "pg_log",
    severity,
    statusLabel: status || severity,
    title: text(data.message) || "PG pipeline log",
    summary: text(data.customer_message) || text(data.message) || "A5 PG pipeline event was recorded.",
    operatorAction: "Check the linked payment/order documents and resolve the blocker shown in technical references.",
    customerMessage: text(data.customer_message) || "Payment status is being checked.",
    developerHint: text(data.developer_hint) || "Use payment_intent_id, order_no, and transaction_id to trace the flow.",
    createdAt: dateValue(data.created_at ?? data.createdAt ?? data.updated_at),
    orderNo: text(data.order_no ?? data.orderNo),
    paymentIntentId: text(data.payment_intent_id ?? data.paymentIntentId),
    transactionId: text(data.transaction_id ?? data.transactionId ?? data.payment_key),
    amount: numberValue(data.amount),
    provider: text(data.provider),
    companyId: text(data.company_id ?? data.companyId),
    technicalRefs: {
      ...compactRecord(stringifyRecord(data.technical_refs)),
      status,
      qrSessionId: text(data.qr_session_id ?? data.qrSessionId),
    },
  };
}

function normalizeReturnTrace(documentId: string, data: FirebaseFirestore.DocumentData): PgMonitorLog {
  const transactionId = text(data.transaction_id ?? data.tid ?? data.pgTid);
  const orderNo = text(data.order_no ?? data.orderNo ?? data.moid ?? data.MOID);
  const resultCode = text(data.result_code ?? data.resultCode ?? data.ResultCode);
  const ok = Boolean(transactionId) || resultCode === "0000" || resultCode === "4100";

  return {
    id: `return-${documentId}`,
    source: "live",
    collection: "payment_return_traces",
    documentId,
    functionName: "paymentsReturnTrace",
    step: "PG 복귀값 수신",
    severity: ok ? "info" : "warning",
    statusLabel: ok ? "복귀값 정상" : "거래번호 확인 필요",
    title: ok ? "인피니 결제창에서 A5로 돌아온 신호" : "인피니 결제창 복귀값은 왔지만 거래번호가 부족함",
    summary: ok
      ? "고객이 카드사/인피니 결제 화면을 거쳐 A5 결제 완료 확인 단계로 돌아왔습니다."
      : "브라우저가 A5로 돌아온 기록은 있으나 TID 또는 승인 결과값이 부족해 거래조회로 보강 확인이 필요합니다.",
    operatorAction: ok
      ? "주문 조회에서 같은 주문번호가 결제완료로 바뀌었는지 확인하세요."
      : "인피니 관리자 또는 거래조회 API에서 주문번호(MOID)와 시간대로 승인 여부를 먼저 확인하세요.",
    customerMessage: ok
      ? "결제 결과 확인 중입니다. 잠시 후 주문조회에서 결제완료 여부를 확인해 주세요."
      : "결제 결과 확인이 지연되고 있습니다. 중복 결제하지 말고 잠시 후 주문조회를 확인해 주세요.",
    developerHint: "Return URL 파라미터를 paymentsSyncInnopaySms로 조회한 뒤 paymentsConfirm으로 주문/결제 장부를 확정해야 합니다.",
    createdAt: dateValue(data.created_at ?? data.createdAt ?? data.updated_at),
    orderNo,
    paymentIntentId: text(data.payment_intent_id ?? data.paymentIntentId),
    transactionId,
    provider: text(data.provider) || "infiny",
    technicalRefs: compactRecord({
      traceId: text(data.trace_id) || documentId,
      shortCode: text(data.short_code),
      qrSessionId: text(data.qr_session_id),
      paramKeys: Array.isArray(data.param_keys) ? data.param_keys.join(", ") : "",
      resultCode,
    }),
  };
}

function normalizePaymentEvent(documentId: string, data: FirebaseFirestore.DocumentData): PgMonitorLog {
  const status = text(data.status ?? data.event_type ?? data.eventType);
  const orderNo = text(data.order_no ?? data.orderNo);
  const transactionId = text(data.transaction_id ?? data.transactionId ?? data.payment_key);
  const severity = statusIncludes(status, ["fail", "error", "reject"]) ? "error" : statusIncludes(status, ["cancel", "pending"]) ? "warning" : "info";

  return {
    id: `event-${documentId}`,
    source: "live",
    collection: "payment_events",
    documentId,
    functionName: text(data.function_name) || "paymentsWebhook/paymentsConfirm",
    step: "PG 이벤트 기록",
    severity,
    statusLabel: severity === "error" ? "실패 이벤트" : severity === "warning" ? "확인 필요" : "이벤트 기록",
    title: severity === "error" ? "PG 결제 실패 또는 거절 이벤트" : "PG 승인/웹훅 이벤트가 기록됨",
    summary: severity === "error"
      ? "결제사가 실패 또는 거절에 가까운 상태를 보냈습니다."
      : "A5가 PG 이벤트를 중복 방지 로그로 저장했습니다.",
    operatorAction: severity === "error"
      ? "주문이 결제완료로 열리지 않았는지 확인하고, 고객에게 재결제 또는 카드사 확인을 안내하세요."
      : "같은 주문번호의 payments/orders 상태가 결제완료로 이어졌는지 확인하세요.",
    customerMessage: severity === "error"
      ? "결제가 완료되지 않았습니다. 카드사 화면의 실패 사유를 확인한 뒤 다시 시도해 주세요."
      : "결제 확인이 접수되었습니다. 주문조회에서 완료 여부를 확인해 주세요.",
    developerHint: "payment_events는 중복 이벤트 방지용입니다. 같은 event_id가 반복되면 장부를 두 번 쓰면 안 됩니다.",
    createdAt: dateValue(data.created_at ?? data.createdAt ?? data.updated_at),
    orderNo,
    paymentIntentId: text(data.payment_intent_id ?? data.paymentIntentId),
    transactionId,
    amount: numberValue(data.amount),
    provider: text(data.provider) || "infiny",
    companyId: text(data.company_id ?? data.companyId),
    technicalRefs: compactRecord({
      eventId: text(data.event_id) || documentId,
      eventType: text(data.event_type ?? data.eventType),
      source: text(data.source),
      mode: text(data.mode),
    }),
  };
}

function normalizeWebhookEvent(documentId: string, data: FirebaseFirestore.DocumentData): PgMonitorLog {
  const verified = data.signature_verified === true;
  const status = text(data.status ?? data.event_type ?? data.eventType);

  return {
    id: `webhook-${documentId}`,
    source: "live",
    collection: "webhook_events",
    documentId,
    functionName: "paymentsWebhook",
    step: "PG 웹훅 수신",
    severity: verified ? "info" : "warning",
    statusLabel: verified ? "서명 확인" : "서명 확인 필요",
    title: verified ? "인피니 서버 통보가 검증됨" : "인피니 서버 통보 서명 확인이 필요함",
    summary: verified
      ? "PG 서버가 보낸 결제 결과 통보가 위변조 검증을 통과했습니다."
      : "웹훅은 들어왔지만 운영 키 또는 서명 검증 설정이 부족할 수 있습니다.",
    operatorAction: verified
      ? "주문 상태가 결제완료 또는 취소로 반영됐는지 확인하세요."
      : "PG Webhook Secret 등록 상태와 인피니 통보 URL 설정을 확인하세요.",
    customerMessage: verified
      ? "결제 결과가 확인되었습니다. 주문조회에서 상태를 확인해 주세요."
      : "결제 결과 확인이 지연되고 있습니다. 고객센터에서 확인 후 안내드리겠습니다.",
    developerHint: "paymentsWebhook은 x-pg-signature와 webhook secret을 검증합니다. 운영 전에는 실제 인피니 Noti/웹훅 규격과 맞춰야 합니다.",
    createdAt: dateValue(data.created_at ?? data.createdAt ?? data.updated_at),
    orderNo: text(data.order_no ?? data.orderNo),
    transactionId: text(data.transaction_id ?? data.transactionId ?? data.payment_key),
    amount: numberValue(data.amount),
    provider: text(data.provider) || "infiny",
    technicalRefs: compactRecord({
      eventId: text(data.event_id) || documentId,
      eventType: status,
      signaturePresent: String(data.signature_present === true),
      signatureVerified: String(verified),
    }),
  };
}

function normalizePaymentLedger(documentId: string, data: FirebaseFirestore.DocumentData): PgMonitorLog {
  const status = text(data.status ?? data.payment_status);
  const approved = statusIncludes(status, ["approved", "confirmed", "paid"]);
  const failed = statusIncludes(status, ["fail", "cancel", "blocked"]);
  const severity: PgLogSeverity = failed ? "error" : approved ? "info" : "warning";

  return {
    id: `payment-${documentId}`,
    source: "live",
    collection: "payments",
    documentId,
    functionName: "paymentsConfirm",
    step: "결제 장부",
    severity,
    statusLabel: approved ? "결제완료" : failed ? "실패/차단" : "진행중",
    title: approved ? "A5 결제 장부가 결제완료로 확정됨" : failed ? "결제 장부가 실패 또는 차단 상태" : "결제 장부가 아직 확정 전",
    summary: approved
      ? "A5 주문, 결제, 재고 차감 기록이 확정된 상태입니다."
      : failed
        ? "결제 승인 또는 주문 확정 중 문제가 있어 운영 확인이 필요합니다."
        : "결제 준비 또는 승인 확인 단계에 머물러 있습니다.",
    operatorAction: approved
      ? "폐쇄몰 주문조회와 기업 주문 목록에 같은 주문이 보이는지 확인하세요."
      : "같은 paymentIntentId의 Return Trace와 PG 거래조회 결과를 함께 확인하세요.",
    customerMessage: approved
      ? "결제가 완료되었습니다. 주문조회에서 주문번호와 상품 정보를 확인해 주세요."
      : "결제 확인이 아직 완료되지 않았습니다. 중복 결제하지 말고 주문조회를 확인해 주세요.",
    developerHint: "paymentsConfirm은 서버 금액 검증, 주문 생성, payment ledger, order_items, QR paid 처리를 한 트랜잭션으로 묶어야 합니다.",
    createdAt: dateValue(data.approved_at ?? data.created_at ?? data.createdAt ?? data.updated_at),
    orderNo: text(data.order_no ?? data.orderNo),
    paymentIntentId: text(data.payment_intent_id ?? data.paymentIntentId) || documentId,
    transactionId: text(data.transaction_id ?? data.transactionId ?? data.provider_payment_key),
    amount: numberValue(data.amount ?? data.total_amount),
    provider: text(data.provider ?? data.pg_provider) || "infiny",
    companyId: text(data.company_id ?? data.companyId),
    customerMasked: text(data.customer_phone_masked ?? data.customerMasked),
    technicalRefs: compactRecord({
      paymentId: documentId,
      status,
      qrSessionId: text(data.qr_session_id ?? data.qrSessionId),
      receiptUrl: text(data.receipt_url ?? data.receiptUrl),
    }),
  };
}

function numberFromQuery(value: unknown): number | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clampNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof value !== "number") return fallback;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function asSeverity(value: unknown): PgLogSeverity {
  return value === "error" || value === "warning" || value === "info" ? value : "info";
}

function dateValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (isTimestampLike(value)) return value.toDate().toISOString();
  if (isSecondsTimestamp(value)) return new Date(value._seconds * 1000).toISOString();
  return new Date().toISOString();
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return Boolean(value && typeof value === "object" && "toDate" in value && typeof (value as TimestampLike).toDate === "function");
}

function isSecondsTimestamp(value: unknown): value is { _seconds: number } {
  return Boolean(value && typeof value === "object" && "_seconds" in value && typeof (value as { _seconds?: unknown })._seconds === "number");
}

function statusIncludes(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

function compactRecord(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry.trim().length > 0));
}

function stringifyRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
      const next = typeof entry === "string" ? entry : JSON.stringify(entry);
      return [key, next ?? ""];
    }),
  );
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<boolean> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: {
        code: "PAYMENT_LOG_MONITOR_AUTH_REQUIRED",
        message: "Firebase ID token is required.",
        httpStatus: 401,
      },
    });
    return false;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    const allowed = role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail;

    if (allowed) return true;
  } catch {
    // Keep denial generic so token details are not leaked.
  }

  sendJson(response, 403, {
    ok: false,
    error: {
      code: "PAYMENT_LOG_MONITOR_FORBIDDEN",
      message: "SUPER_ADMIN permission is required.",
      httpStatus: 403,
    },
  });
  return false;
}
