import { getAdminAuth, getAdminDb } from "../firebaseAdmin";
import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "./types";

type LookupRequest = {
  orderNo?: unknown;
  paymentIntentId?: unknown;
  transactionId?: unknown;
  tid?: unknown;
};

const masterAdminEmail = "rosabaya08@gmail.com";

export async function paymentsListInnopayTransactionsHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (request.method !== "GET") {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET for InnoPay transaction list.", httpStatus: 405 },
    });
    return;
  }
  if (!(await requireSuperAdmin(request, response))) return;

  const limit = clampNumber(numberFromQuery(request.query?.limit), 30, 1, 100);
  const docs = await readRecent("payments", Math.min(limit * 3, 200));
  const transactions = docs
    .map((doc) => toTransactionRow(doc.id, doc.data()))
    .filter((row) => isInnopayRelated(row))
    .slice(0, limit);

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions_innopay_transactions_readonly",
    count: transactions.length,
    transactions,
    message: "InnoPay transaction rows were read from A5 payment ledgers. No provider API was called.",
  });
}

export async function paymentsLookupInnopayTransactionHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for InnoPay transaction lookup.", httpStatus: 405 },
    });
    return;
  }
  if (!(await requireSuperAdmin(request, response))) return;

  const input = lookupInput(request);
  if (!input.orderNo && !input.paymentIntentId && !input.transactionId) {
    sendJson(response, 400, {
      ok: false,
      error: { code: "INNOPAY_TRANSACTION_LOOKUP_INPUT_INVALID", message: "orderNo, paymentIntentId, transactionId, or tid is required.", httpStatus: 400 },
    });
    return;
  }

  const matches = await findPaymentMatches(input);
  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions_innopay_transaction_lookup_readonly",
    count: matches.length,
    transactions: matches,
    message: "Matching A5 payment ledgers were read. No provider API was called.",
  });
}

export async function paymentsQueryInnopayVbankHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? ""))) {
    sendJson(response, 405, {
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for InnoPay vbank query.", httpStatus: 405 },
    });
    return;
  }
  if (!(await requireSuperAdmin(request, response))) return;

  const input = lookupInput(request);
  const transactions = input.orderNo || input.paymentIntentId || input.transactionId
    ? await findPaymentMatches(input)
    : (await readRecent("payments", 160)).map((doc) => toTransactionRow(doc.id, doc.data())).filter((row) => row.vbank);

  sendJson(response, 200, {
    ok: true,
    source: "firebase_functions_innopay_vbank_query_readonly",
    count: transactions.length,
    transactions,
    message: "InnoPay virtual-account rows were read from A5 ledgers. No provider API was called.",
  });
}

async function findPaymentMatches(input: { orderNo?: string; paymentIntentId?: string; transactionId?: string }) {
  const db = getAdminDb();
  const refs = new Map<string, FirebaseFirestore.DocumentSnapshot>();

  if (input.paymentIntentId) {
    const direct = await db.collection("payments").doc(input.paymentIntentId).get();
    if (direct.exists) refs.set(direct.id, direct);
  }

  for (const [field, value] of [
    ["order_no", input.orderNo],
    ["payment_intent_id", input.paymentIntentId],
    ["provider_transaction_id", input.transactionId],
    ["transaction_id", input.transactionId],
    ["innopay_tid", input.transactionId],
  ] as const) {
    if (!value) continue;
    const snapshot = await db.collection("payments").where(field, "==", value).limit(20).get();
    snapshot.docs.forEach((doc) => refs.set(doc.id, doc));
  }

  return [...refs.values()].map((doc) => toTransactionRow(doc.id, doc.data() ?? {}));
}

async function readRecent(collectionName: string, limit: number) {
  const db = getAdminDb();
  try {
    const snapshot = await db.collection(collectionName).orderBy("created_at", "desc").limit(limit).get();
    return snapshot.docs;
  } catch {
    const snapshot = await db.collection(collectionName).limit(limit).get();
    return snapshot.docs;
  }
}

function toTransactionRow(documentId: string, data: FirebaseFirestore.DocumentData) {
  const transactionId = text(data.provider_transaction_id ?? data.transaction_id ?? data.innopay_tid);
  const provider = text(data.provider ?? data.pg_provider) || "unknown";
  const vbankNumMasked = text(data.vbank_num_masked);
  return {
    id: documentId,
    orderNo: text(data.order_no ?? data.orderNo),
    paymentIntentId: text(data.payment_intent_id ?? data.paymentIntentId) || documentId,
    transactionId,
    provider,
    status: text(data.status ?? data.payment_status),
    amount: numberValue(data.amount ?? data.total_amount),
    companyId: text(data.company_id ?? data.companyId),
    merchantIdMasked: maskMerchantId(text(data.merchant_id ?? data.mid)),
    createdAt: dateValue(data.created_at ?? data.createdAt ?? data.approved_at ?? data.updated_at),
    vbank: Boolean(vbankNumMasked || data.vbank_bank_name || data.innopay_vbank_result_code),
    vbankBankName: text(data.vbank_bank_name),
    vbankNumMasked,
    resultCode: text(data.innopay_vbank_result_code ?? data.result_code),
    resultMessage: text(data.innopay_vbank_result_msg ?? data.result_msg),
    technicalRefs: compactRecord({
      source: text(data.source),
      qrSessionId: text(data.qr_session_id ?? data.qrSessionId),
      deliveryStatus: text(data.delivery_status ?? data.deliveryStatus),
    }),
  };
}

function lookupInput(request: HttpRequestLike) {
  const body = readObjectBody<LookupRequest>(request);
  return {
    orderNo: text(request.query?.orderNo ?? body.orderNo),
    paymentIntentId: text(request.query?.paymentIntentId ?? body.paymentIntentId),
    transactionId: text(request.query?.transactionId ?? request.query?.tid ?? body.transactionId ?? body.tid),
  };
}

async function requireSuperAdmin(request: HttpRequestLike, response: HttpResponseLike): Promise<boolean> {
  const authorization = request.get?.("authorization") ?? request.get?.("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    sendJson(response, 401, {
      ok: false,
      error: { code: "INNOPAY_TRANSACTION_AUTH_REQUIRED", message: "Firebase ID token is required.", httpStatus: 401 },
    });
    return false;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    const role = String(decoded.role ?? "");
    const email = String(decoded.email ?? "").trim().toLowerCase();
    if (role === "SUPER_ADMIN" || role === "seed_admin" || decoded.seed_admin === true || email === masterAdminEmail) return true;
  } catch {
    // Deny without leaking token details.
  }

  sendJson(response, 403, {
    ok: false,
    error: { code: "INNOPAY_TRANSACTION_FORBIDDEN", message: "SUPER_ADMIN permission is required.", httpStatus: 403 },
  });
  return false;
}

function isInnopayRelated(row: ReturnType<typeof toTransactionRow>) {
  const provider = row.provider.toLowerCase();
  return provider === "infiny" || provider === "innopay" || Boolean(row.transactionId || row.vbank);
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

function dateValue(value: unknown): string {
  if (typeof value === "string" && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  if (value && typeof value === "object" && "_seconds" in value && typeof (value as { _seconds?: unknown })._seconds === "number") {
    return new Date((value as { _seconds: number })._seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function maskMerchantId(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function compactRecord(value: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry.trim().length > 0));
}
