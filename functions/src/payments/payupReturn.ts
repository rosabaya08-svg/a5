import type { HttpRequestLike, HttpResponseLike } from "./types";

type PayupReturnRecord = Record<string, unknown>;

const defaultStorefrontOrigin = "https://signage-ai-a5.co.kr";

export async function paymentsPayupReturnHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!["GET", "POST"].includes(String(request.method ?? "").toUpperCase())) {
    response.status(405).json({
      ok: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Use GET or POST for the Payup return endpoint." },
    });
    return;
  }

  const query = asRecord(request.query);
  const body = readReturnBody(request);
  const bypass = parseBypassValue(firstText(body.bypassValue, query.bypassValue));
  const merged = { ...query, ...bypass, ...body };
  const transactionId = firstText(
    merged.transactionId,
    merged.transaction_id,
    merged.tid,
    merged.TID,
    merged.pgTid,
    merged.PgTid,
  );
  const orderNo = firstText(
    merged.orderNumber,
    merged.orderNo,
    merged.order_no,
    merged.MOID,
    merged.moid,
  );
  const paymentIntentId = firstText(merged.paymentIntentId, merged.payment_intent_id);
  const shortCode = firstText(merged.shortCode, merged.code);
  const amount = firstText(merged.amount, merged.paymentAmount);
  const storefrontOrigin = allowedStorefrontOrigin(firstText(query.returnOrigin, bypass.returnOrigin));
  const target = new URL("/q/live/", storefrontOrigin);

  if (shortCode) target.searchParams.set("code", shortCode);
  if (paymentIntentId) target.searchParams.set("paymentIntentId", paymentIntentId);
  if (orderNo) target.searchParams.set("orderNo", orderNo);
  if (transactionId) target.searchParams.set("transactionId", transactionId);
  if (amount) target.searchParams.set("amount", amount);
  target.searchParams.set("provider", "payup");
  target.searchParams.set("paymentResult", transactionId ? "returned" : "failed");
  if (!transactionId) target.searchParams.set("errorCode", "PAYUP_TRANSACTION_ID_MISSING");

  if (response.redirect) {
    response.redirect(303, target.toString());
    return;
  }

  response.setHeader?.("Location", target.toString());
  response.status(303).send?.("");
}

function readReturnBody(request: HttpRequestLike): PayupReturnRecord {
  if (request.body && typeof request.body === "object" && !Array.isArray(request.body)) {
    return request.body as PayupReturnRecord;
  }

  const raw = Buffer.isBuffer(request.rawBody)
    ? request.rawBody.toString("utf8")
    : typeof request.rawBody === "string"
      ? request.rawBody
      : typeof request.body === "string"
        ? request.body
        : "";
  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    return asRecord(parsed);
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function parseBypassValue(value: string): PayupReturnRecord {
  if (!value) return {};

  try {
    return asRecord(JSON.parse(value));
  } catch {
    return {};
  }
}

function asRecord(value: unknown): PayupReturnRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as PayupReturnRecord : {};
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (Array.isArray(value)) {
      const nested = firstText(value[0]);
      if (nested) return nested;
      continue;
    }
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function allowedStorefrontOrigin(value: string): string {
  if (!value) return defaultStorefrontOrigin;

  try {
    const origin = new URL(value).origin;
    if (origin === defaultStorefrontOrigin) return origin;
    if (/^https:\/\/[a-z0-9-]+\.pages\.dev$/i.test(origin)) return origin;
    if (/^https:\/\/[a-z0-9.-]+\.signage-ai-a5\.co\.kr$/i.test(origin)) return origin;
    if (/^http:\/\/localhost:\d+$/i.test(origin)) return origin;
  } catch {
    return defaultStorefrontOrigin;
  }

  return defaultStorefrontOrigin;
}

