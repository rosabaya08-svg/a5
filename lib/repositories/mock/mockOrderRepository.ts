import { mockOrders, mockOrderItems } from "@/data/mockOrders";
import type { OrderRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockOrderRepository: OrderRepository = {
  async listOrders(filters) {
    const orders = mockOrders.filter((order) => {
      if (filters?.status && order.status !== filters.status) return false;
      if (filters?.from && order.createdAt < filters.from) return false;
      if (filters?.to && order.createdAt > filters.to) return false;
      return true;
    });

    return repositoryOk(orders);
  },

  async getOrderByOrderNo(orderNo) {
    const order = mockOrders.find((item) => item.orderNo === orderNo);

    if (!order) {
      return repositoryError("NOT_FOUND", "Order not found", orderNo);
    }

    const items = mockOrderItems.filter((item) => order.itemIds.includes(item.id));
    return repositoryOk({ order, items });
  },

  async listOrdersByNursery(nurseryId, filters) {
    const orders = mockOrders.filter((order) => {
      if (order.nurseryId !== nurseryId) return false;
      if (filters?.status && order.status !== filters.status) return false;
      if (filters?.from && order.createdAt < filters.from) return false;
      if (filters?.to && order.createdAt > filters.to) return false;
      return true;
    });

    return repositoryOk(orders);
  },

  async listOrderItemsByCompany(companyId, filters) {
    const items = mockOrderItems.filter((item) => {
      if (item.companyId !== companyId) return false;
      if (filters?.deliveryStatus && item.deliveryStatus !== filters.deliveryStatus) return false;
      return true;
    });

    return repositoryOk(items);
  },

  async createOrderFromQrSnapshot(input) {
    const order = {
      id: `mock-order-${input.orderNo}`,
      orderNo: input.orderNo,
      qrSessionId: input.qrSession.id,
      nurseryId: input.qrSession.nurseryId,
      roomId: input.qrSession.roomId,
      customerName: input.customerName,
      customerPhoneMasked: input.customerPhoneMasked,
      status: "paid" as const,
      deliveryMethod: input.qrSession.deliveryMethod,
      totalAmount: input.qrSession.totalAmount,
      paidAt: input.paidAt,
      createdAt: input.createdAt,
      itemIds: input.qrSession.items.map((item, index) => `mock-order-item-${input.orderNo}-${index + 1}`),
    };

    const items = input.qrSession.items.map((item, index) => ({
      id: order.itemIds[index],
      orderId: order.id,
      companyId: item.companyId,
      productName: item.productName,
      optionName: item.optionName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      deliveryStatus: input.qrSession.deliveryMethod === "pickup" ? "pickup_ready" as const : "invoice_pending" as const,
      settlementAmount: Math.round(item.unitPrice * item.quantity * 0.85),
    }));

    return repositoryOk({ order, items });
  },
};
