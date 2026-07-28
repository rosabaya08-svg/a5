import { readObjectBody, sendJson, type HttpRequestLike, type HttpResponseLike } from "../../payments/types";
import { appendIntegrationCallLog, readIntegrationAuth } from "../core/auth";
import { listCompanyIntegrationEvents, markCompanyIntegrationEvent, type IntegrationEventStatus } from "../core/events";
import { listCompanyIntegrationOrdersPage, updateOrderItemsShipment, updateOrderItemsStatus } from "../core/orders";
import { listCompanyIntegrationProducts } from "../core/products";
import type { IntegrationOrderStatus } from "../core/types";

export async function standardOrdersListHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  const body = readObjectBody<Record<string, unknown>>(request);
  const query = request.query ?? {};
  const auth = await readIntegrationAuth(request, response, "STANDARD", { ...query, ...body }, "orders:read");
  if (!auth) return;

  const page = await listCompanyIntegrationOrdersPage({
    companyId: auth.companyId,
    orderNo: optionalText(query.orderNo ?? body.orderNo),
    startDate: optionalText(query.from ?? body.from),
    endDate: optionalText(query.to ?? body.to),
    limit: numberValue(query.limit ?? body.limit),
    cursor: optionalText(query.cursor ?? body.cursor),
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "STANDARD",
    endpoint: "orders",
    status: "success",
    resultCount: page.items.length,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    ok: true,
    platformType: "STANDARD",
    companyId: auth.companyId,
    orders: page.items,
    count: page.items.length,
    nextCursor: page.nextCursor ?? null,
  });
}

export async function standardShipmentCreateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  const body = readObjectBody<Record<string, unknown>>(request);
  const auth = await readIntegrationAuth(request, response, "STANDARD", body, "shipments:write");
  if (!auth) return;

  const orderNo = text(body.orderNo);
  const carrierCode = text(body.carrierCode);
  const sheetNo = text(body.invoiceNumber ?? body.trackingNo);
  if (!orderNo || !carrierCode || !sheetNo) {
    sendJson(response, 400, {
      ok: false,
      resultCode: 400,
      resultMsg: "orderNo, carrierCode, and invoiceNumber are required.",
    });
    return;
  }

  const result = await updateOrderItemsShipment({
    companyId: auth.companyId,
    orderNo,
    orderGoodsNum: optionalText(body.orderItemId),
    carrierCode,
    sheetNo,
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "STANDARD",
    endpoint: "shipments",
    status: "success",
    resultCount: result.updated,
    httpStatus: 200,
    orderNo,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    ok: true,
    companyId: auth.companyId,
    updatedCnt: result.updated,
  });
}

export async function standardProductsListHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  const body = readObjectBody<Record<string, unknown>>(request);
  const query = request.query ?? {};
  const auth = await readIntegrationAuth(request, response, "STANDARD", { ...query, ...body }, "products:read");
  if (!auth) return;

  const page = await listCompanyIntegrationProducts({
    companyId: auth.companyId,
    productId: optionalText(query.productId ?? body.productId),
    limit: numberValue(query.limit ?? body.limit),
    cursor: optionalText(query.cursor ?? body.cursor),
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "STANDARD",
    endpoint: "products",
    status: "success",
    resultCount: page.items.length,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    ok: true,
    platformType: "STANDARD",
    companyId: auth.companyId,
    products: page.items,
    count: page.items.length,
    nextCursor: page.nextCursor ?? null,
  });
}

export async function standardOrderStatusUpdateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  const body = readObjectBody<Record<string, unknown>>(request);
  const auth = await readIntegrationAuth(request, response, "STANDARD", body, "orders:status");
  if (!auth) return;

  const orderNo = text(body.orderNo);
  const status = standardStatus(body.status);
  if (!orderNo || !status) {
    sendJson(response, 400, {
      ok: false,
      resultCode: 400,
      resultMsg: "orderNo and status are required.",
    });
    return;
  }

  const result = await updateOrderItemsStatus({
    companyId: auth.companyId,
    orderNo,
    orderGoodsNum: optionalText(body.orderItemId),
    status,
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "STANDARD",
    endpoint: "order-status",
    status: "success",
    resultCount: result.updated,
    httpStatus: 200,
    orderNo,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    ok: true,
    companyId: auth.companyId,
    updatedCnt: result.updated,
  });
}

export async function standardEventsListHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  const body = readObjectBody<Record<string, unknown>>(request);
  const query = request.query ?? {};
  const auth = await readIntegrationAuth(request, response, "STANDARD", { ...query, ...body }, "events:read");
  if (!auth) return;

  const page = await listCompanyIntegrationEvents({
    companyId: auth.companyId,
    platformType: "STANDARD",
    status: eventStatus(query.status ?? body.status),
    limit: numberValue(query.limit ?? body.limit),
    cursor: optionalText(query.cursor ?? body.cursor),
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "STANDARD",
    endpoint: "events",
    status: "success",
    resultCount: page.items.length,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    ok: true,
    companyId: auth.companyId,
    events: page.items,
    count: page.items.length,
    nextCursor: page.nextCursor ?? null,
  });
}

export async function standardEventStatusUpdateHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  const body = readObjectBody<Record<string, unknown>>(request);
  const auth = await readIntegrationAuth(request, response, "STANDARD", body, "events:write");
  if (!auth) return;

  const eventId = text(body.eventId);
  const nextStatus = eventStatus(body.status);
  if (!eventId || !nextStatus) {
    sendJson(response, 400, {
      ok: false,
      resultCode: 400,
      resultMsg: "eventId and status are required.",
    });
    return;
  }

  const result = await markCompanyIntegrationEvent({
    companyId: auth.companyId,
    eventId,
    nextStatus,
    errorMessage: optionalText(body.errorMessage),
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "STANDARD",
    endpoint: "event-status",
    status: result.updated ? "success" : "failed",
    httpStatus: result.updated ? 200 : 404,
    eventId,
    ...auth.logContext,
  });

  sendJson(response, result.updated ? 200 : 404, {
    ok: result.updated,
    companyId: auth.companyId,
    eventId,
    status: nextStatus,
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || undefined;
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function standardStatus(value: unknown): IntegrationOrderStatus | undefined {
  const status = text(value);
  if (
    status === "paid" ||
    status === "ready_to_ship" ||
    status === "shipping" ||
    status === "delivered" ||
    status === "cancelled" ||
    status === "return_requested" ||
    status === "returned" ||
    status === "exchange_requested" ||
    status === "exchanged"
  ) {
    return status;
  }

  return undefined;
}

function eventStatus(value: unknown): IntegrationEventStatus | undefined {
  const status = text(value);
  if (status === "ready" || status === "sent" || status === "failed" || status === "retrying" || status === "cancelled") {
    return status;
  }

  return undefined;
}
