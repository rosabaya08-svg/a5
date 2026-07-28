import type { IntegrationOrder, IntegrationOrderStatus } from "../core/types";
import { toSabangDate } from "../core/orders";

const sabangStatusByA5Status: Record<IntegrationOrderStatus, string> = {
  paid: "1001",
  ready_to_ship: "1002",
  shipping: "1003",
  delivered: "1004",
  cancelled: "1005",
  return_requested: "1007",
  returned: "1008",
  exchange_requested: "1011",
  exchanged: "1012",
};

export function a5StatusFromSabangStatus(status: unknown): IntegrationOrderStatus {
  const value = String(status ?? "");
  if (value === "1002") return "ready_to_ship";
  if (value === "1003") return "shipping";
  if (value === "1004") return "delivered";
  if (value === "1005") return "cancelled";
  if (value === "1007") return "return_requested";
  if (value === "1008") return "returned";
  if (value === "1011") return "exchange_requested";
  if (value === "1012") return "exchanged";
  return "paid";
}

export function toSabangOrder(order: IntegrationOrder) {
  return {
    sndNm: order.customerName,
    sndTelNum: order.customerPhoneMasked,
    sndMobile: order.customerPhoneMasked,
    rcvrNm: order.customerName,
    rcvrTelNum: order.customerPhoneMasked,
    rcvrMobile: order.customerPhoneMasked,
    rcvrPost: "",
    rcvrAddr1: order.receiverAddress ?? (order.deliveryMethod === "pickup" ? "A5 closed mall pickup" : ""),
    rcvrAddr2: order.receiverAddressDetail ?? "",
    orderNum: order.orderNo,
    orderDt: toSabangDate(order.paidAt || order.createdAt),
    aspOrderNum: order.id,
    orderReqContent: "",
    dlvrHopeDt: null,
    arrOrderGoods: order.items.map((item, index) => ({
      orderGoodsNum: item.id || String(index + 1),
      orderStatus: sabangStatusByA5Status[order.status],
      goodsCd: item.productId,
      goodsNm: `<![CDATA[${item.productName}]]>`,
      orderQty: item.quantity,
      optionContent: `<![CDATA[${item.optionName}]]>`,
      salePrice: item.unitPrice,
      optionAddPrice: 0,
      dlvrPayCd: "1001",
      dlvrPrice: 0,
      buyDecisonDt: "",
      settleExpectDt: "",
      settlementPrice: String(item.settlementAmount),
      sheetNo: item.sheetNo ?? null,
      dlvrCd: item.carrierCode ?? null,
    })),
  };
}
