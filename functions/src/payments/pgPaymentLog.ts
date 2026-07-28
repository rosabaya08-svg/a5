import { createHash } from "crypto";
import { FieldValue, type Firestore, type Transaction } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";

export type PgPaymentLogSeverity = "info" | "warning" | "error";

export type PgPaymentLogInput = {
  id?: string;
  functionName: string;
  step: string;
  status: string;
  severity: PgPaymentLogSeverity;
  provider?: string;
  companyId?: string;
  orderNo?: string;
  paymentIntentId?: string;
  qrSessionId?: string;
  guestShopSessionId?: string;
  transactionId?: string;
  paymentKey?: string;
  amount?: number;
  message?: string;
  customerMessage?: string;
  developerHint?: string;
  technicalRefs?: Record<string, unknown>;
  createdAt?: string;
};

export function buildPgPaymentLogDocument(input: PgPaymentLogInput) {
  const createdAt = input.createdAt || new Date().toISOString();
  const documentId = input.id || makePgPaymentLogId(input);

  return compactRecord({
    id: documentId,
    function_name: input.functionName,
    step: input.step,
    status: input.status,
    severity: input.severity,
    provider: input.provider,
    company_id: input.companyId,
    order_no: input.orderNo,
    payment_intent_id: input.paymentIntentId,
    qr_session_id: input.qrSessionId,
    guest_shop_session_id: input.guestShopSessionId,
    transaction_id: input.transactionId,
    payment_key: maskSensitive(input.paymentKey),
    amount: input.amount,
    message: input.message,
    customer_message: input.customerMessage,
    developer_hint: input.developerHint,
    technical_refs: compactRecord(input.technicalRefs ?? {}),
    source: "firebase_functions_pg_pipeline",
    created_at: createdAt,
    updated_at: FieldValue.serverTimestamp(),
  });
}

export function setPgPaymentLog(transaction: Transaction, db: Firestore, input: PgPaymentLogInput) {
  const document = buildPgPaymentLogDocument(input);
  const documentId = String(document.id);
  transaction.set(db.collection("pg_payment_logs").doc(documentId), document, { merge: true });
  return documentId;
}

export async function appendPgPaymentLog(input: PgPaymentLogInput) {
  const db = getAdminDb();
  const document = buildPgPaymentLogDocument(input);
  const documentId = String(document.id);
  await db.collection("pg_payment_logs").doc(documentId).set(document, { merge: true });
  return documentId;
}

function makePgPaymentLogId(input: PgPaymentLogInput) {
  const basis = [
    input.functionName,
    input.step,
    input.paymentIntentId,
    input.orderNo,
    input.transactionId,
    input.status,
    input.createdAt,
  ].filter(Boolean).join(":");
  const hash = createHash("sha256").update(basis || JSON.stringify(input)).digest("hex").slice(0, 16);
  const prefix = safeId(input.paymentIntentId || input.orderNo || input.transactionId || input.step || "pg-log");
  return `${prefix}-${hash}`;
}

function compactRecord(record: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

function safeId(value: string) {
  const clean = value.replace(/[^0-9A-Za-z_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (clean || "pg-log").slice(0, 80);
}

function maskSensitive(value?: string) {
  if (!value) return undefined;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}
