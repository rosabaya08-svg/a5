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
      `${request.carrierName} ${request.invoiceNo} mock invoice entered`,
      "Mock hub scan",
      "Mock delivery in progress",
    ],
  };
}

export function completePickupMock(orderNo: string): DeliveryMockResult {
  return {
    orderNo,
    status: "delivered",
    history: ["Mock pickup ready", "Mock pickup completed at nursery desk"],
  };
}
