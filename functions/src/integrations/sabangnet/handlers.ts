import { readObjectBody, requirePost, sendJson, type HttpRequestLike, type HttpResponseLike } from "../../payments/types";
import { appendIntegrationCallLog, readIntegrationAuth } from "../core/auth";
import { listCompanyIntegrationOrdersPage, toSabangDate, updateOrderItemsShipment, updateOrderItemsStatus } from "../core/orders";
import { listCompanyIntegrationProducts } from "../core/products";
import type { IntegrationProduct } from "../core/types";
import { a5StatusFromSabangStatus, toSabangOrder } from "./mapper";

export async function sabangnetOrderListAPIHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<Record<string, unknown>>(request);
  const auth = await readIntegrationAuth(request, response, "SABANGNET", body, "orders:read");
  if (!auth) return;

  const page = await listCompanyIntegrationOrdersPage({
    companyId: auth.companyId,
    orderNo: optionalText(body.orderNum),
    startDate: optionalText(body.startDate),
    endDate: optionalText(body.endDate),
    status: body.orderStatus ? a5StatusFromSabangStatus(body.orderStatus) : undefined,
    limit: numberValue(body.limit),
    cursor: optionalText(body.cursor),
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "SABANGNET",
    endpoint: "orderListAPI",
    status: "success",
    resultCount: page.items.length,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    resultCode: 200,
    resultMsg: "성공",
    arrOrderList: page.items.map(toSabangOrder),
    orderCnt: page.items.length,
    nextCursor: page.nextCursor ?? null,
  });
}

export async function sabangnetSheetNoInfoAPIHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<{ arrSheetNoInfo?: unknown[] }>(request);
  const auth = await readIntegrationAuth(request, response, "SABANGNET", body as Record<string, unknown>, "shipments:write");
  if (!auth) return;

  const rows = Array.isArray(body.arrSheetNoInfo) ? body.arrSheetNoInfo : [];
  let updated = 0;

  for (const row of rows) {
    const data = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const orderNo = text(data.orderNum);
    const carrierCode = text(data.dlvrCd);
    const sheetNo = text(data.sheetNo);
    if (!orderNo || !carrierCode || !sheetNo) continue;

    const result = await updateOrderItemsShipment({
      companyId: auth.companyId,
      orderNo,
      orderGoodsNum: optionalText(data.orderGoodsNum),
      carrierCode,
      sheetNo,
    });
    updated += result.updated;
  }

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "SABANGNET",
    endpoint: "sheetNoInfoAPI",
    status: "success",
    resultCount: updated,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    resultCode: 200,
    resultMsg: "성공",
    updatedCnt: updated,
  });
}

export async function sabangnetOrderStatusInfoAPIHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;

  const body = readObjectBody<{ arrOrderStatusInfo?: unknown[] }>(request);
  const auth = await readIntegrationAuth(request, response, "SABANGNET", body as Record<string, unknown>, "orders:status");
  if (!auth) return;

  const rows = Array.isArray(body.arrOrderStatusInfo) ? body.arrOrderStatusInfo : [];
  let updated = 0;

  for (const row of rows) {
    const data = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    const orderNo = text(data.orderNum);
    if (!orderNo || !text(data.orderStatus)) continue;

    const result = await updateOrderItemsStatus({
      companyId: auth.companyId,
      orderNo,
      orderGoodsNum: optionalText(data.orderGoodsNum),
      status: a5StatusFromSabangStatus(data.orderStatus),
    });
    updated += result.updated;
  }

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "SABANGNET",
    endpoint: "orderStatusInfoAPI",
    status: "success",
    resultCount: updated,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    resultCode: 200,
    resultMsg: "성공",
    updatedCnt: updated,
  });
}

export async function sabangnetGoodsViewAPIHandler(request: HttpRequestLike, response: HttpResponseLike): Promise<void> {
  if (!requirePost(request, response)) return;
  const body = readObjectBody<Record<string, unknown>>(request);
  const auth = await readIntegrationAuth(request, response, "SABANGNET", body, "products:read");
  if (!auth) return;

  const page = await listCompanyIntegrationProducts({
    companyId: auth.companyId,
    productId: optionalText(body.goodsCd ?? body.goods_cd ?? body.productId),
    limit: numberValue(body.limit),
    cursor: optionalText(body.cursor),
  });

  await appendIntegrationCallLog({
    companyId: auth.companyId,
    platformType: "SABANGNET",
    endpoint: "goodsViewAPI",
    status: "success",
    resultCount: page.items.length,
    httpStatus: 200,
    ...auth.logContext,
  });

  sendJson(response, 200, {
    resultCode: 200,
    resultMsg: "성공",
    arrGoodsList: page.items.map(toSabangProduct),
    goodsCnt: page.items.length,
    nextCursor: page.nextCursor ?? null,
  });
}

function text(value: unknown) {
  return String(value ?? "").trim();
}

function optionalText(value: unknown) {
  const result = text(value);
  return result || undefined;
}

function toSabangProduct(product: IntegrationProduct) {
  return {
    goodsCd: product.id,
    goodsNm: `<![CDATA[${product.name}]]>`,
    modelNo: product.modelNo,
    brandNm: product.brandName,
    makerNm: product.makerName,
    salePrice: product.salePrice,
    stockQty: product.stockQty,
    goodsStatus: sabangGoodsStatus(product.status),
    imageUrl: product.imageUrl,
    updatedDt: toSabangDate(product.updatedAt),
  };
}

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sabangGoodsStatus(status: unknown) {
  const value = text(status).toLowerCase();
  if (value === "active" || value === "approved" || value === "live") return "1001";
  if (value === "sold_out") return "1002";
  if (value === "paused" || value === "hidden") return "1003";
  return "1001";
}
