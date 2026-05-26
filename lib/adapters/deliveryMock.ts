export type DeliveryMockRequest = {
  orderNo: string;
  carrierName: string;
  invoiceNo: string;
};

export type DeliveryMockResult = {
  orderNo: string;
  status: "invoice_entered" | "in_transit" | "delivered";
  history: string[];
};

export function trackDeliveryMock(request: DeliveryMockRequest): DeliveryMockResult {
  return {
    orderNo: request.orderNo,
    status: "in_transit",
    history: [
      `${request.carrierName} ${request.invoiceNo} 모의 송장 입력`,
      "모의 허브 스캔",
      "모의 배송 진행 중",
    ],
  };
}

export function completePickupMock(orderNo: string): DeliveryMockResult {
  return {
    orderNo,
    status: "delivered",
    history: ["모의 현장수령 준비", "조리원 데스크 모의 수령 완료"],
  };
}
