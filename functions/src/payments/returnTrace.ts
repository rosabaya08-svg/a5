import { createHash } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "../firebaseAdmin";
import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "./types";
import { appendPgPaymentLog } from "./pgPaymentLog";

type PaymentReturnTraceRequest = {
  provider?: string;
  paymentIntentId?: string;
  orderNo?: string;
  transactionId?: string;
  shortCode?: string;
  qrSessionId?: string;
  href?: string;
  params?: Record<string, unknown>;
};

const sensitiveKeyPattern = /(key|secret|pwd|password|license|token|auth|identity|soc|card|account)/i;

export async function paymentsReturnTraceHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<PaymentReturnTraceRequest>(request);
  const params = asRecord(body.params);
  const provider = text(body.provider) || "payup";
  const paymentIntentId = text(body.paymentIntentId);
  const orderNo = text(body.orderNo);
  const transactionId = text(body.transactionId);
  const shortCode = text(body.shortCode);
  const qrSessionId = text(body.qrSessionId);
  const hrefSummary = summarizeUrl(text(body.href));
  const paramsMasked = maskRecord(params);
  const paramKeys = Object.keys(paramsMasked).sort().slice(0, 80);
  const traceBasis = JSON.stringify({ provider, paymentIntentId, orderNo, transactionId, shortCode, paramKeys, paramsMasked });
  const traceHash = createHash("sha256").update(traceBasis).digest("hex").slice(0, 18);
  const traceId = `return-${safeId(paymentIntentId || orderNo || transactionId || shortCode || "unknown")}-${traceHash}`;

  try {
    const db = getAdminDb();
    await db.collection("payment_return_traces").doc(traceId).set(
      {
        trace_id: traceId,
        provider,
        payment_intent_id: paymentIntentId || null,
        order_no: orderNo || null,
        transaction_id: transactionId || null,
        short_code: shortCode || null,
        qr_session_id: qrSessionId || null,
        href_summary: hrefSummary,
        param_keys: paramKeys,
        params_masked: paramsMasked,
        source: "browser_pg_return",
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    await appendPgPaymentLog({
      id: `return-${traceId}`,
      functionName: "paymentsReturnTrace",
      step: "return_trace",
      status: transactionId ? "returned_with_transaction" : "returned",
      severity: transactionId ? "info" : "warning",
      provider,
      paymentIntentId: paymentIntentId || undefined,
      orderNo: orderNo || undefined,
      qrSessionId: qrSessionId || undefined,
      transactionId: transactionId || undefined,
      message: transactionId
        ? "Browser returned from the PG checkout with a transaction id."
        : "Browser returned from the PG checkout without a transaction id.",
      developerHint: "Check params_masked in payment_return_traces, then confirm or lookup the transaction by provider/order_no.",
      technicalRefs: {
        traceId,
        shortCode,
        paramKeyCount: paramKeys.length,
        hrefPathname: hrefSummary.pathname,
      },
    });

    sendJson(response, 200, {
      ok: true,
      traceId,
      paramKeyCount: paramKeys.length,
      message: "Payment return trace was recorded with masked parameters.",
    });
  } catch (error) {
    sendJson(response, 503, {
      ok: false,
      error: {
        code: "PAYMENT_RETURN_TRACE_WRITE_FAILED",
        message: error instanceof Error ? error.message : "Unknown payment return trace write error.",
        httpStatus: 503,
      },
    });
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function text(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function safeId(value: string) {
  const clean = value.replace(/[^0-9A-Za-z_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return (clean || "unknown").slice(0, 80);
}

function maskRecord(params: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(params)
      .slice(0, 120)
      .map(([key, value]) => [key, maskParam(key, value)]),
  );
}

function maskParam(key: string, value: unknown) {
  const textValue = String(Array.isArray(value) ? value[0] ?? "" : value ?? "").trim();
  if (!textValue) return "";
  if (sensitiveKeyPattern.test(key)) return maskMiddle(textValue);
  if (/@/.test(textValue)) return maskEmail(textValue);
  if (/^\d{7,}$/.test(textValue)) return maskMiddle(textValue);
  return textValue.length > 120 ? `${textValue.slice(0, 120)}...` : textValue;
}

function maskMiddle(value: string) {
  if (value.length <= 4) return "****";
  if (value.length <= 8) return `${value.slice(0, 2)}****${value.slice(-2)}`;
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

function maskEmail(value: string) {
  const [local, domain] = value.split("@");
  if (!local || !domain) return maskMiddle(value);
  return `${local.slice(0, 2)}***@${domain}`;
}

function summarizeUrl(value: string) {
  if (!value) return { origin: "", pathname: "", queryKeys: [] as string[] };

  try {
    const url = new URL(value);
    return {
      origin: url.origin,
      pathname: url.pathname,
      queryKeys: Array.from(url.searchParams.keys()).sort().slice(0, 80),
    };
  } catch {
    return { origin: "", pathname: value.slice(0, 120), queryKeys: [] as string[] };
  }
}
