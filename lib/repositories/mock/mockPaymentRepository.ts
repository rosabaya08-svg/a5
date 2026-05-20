import { mockPayments } from "@/data/mockOrders";
import type { PaymentRepository } from "@/lib/repositories/types";
import { repositoryError, repositoryOk } from "@/lib/repositories/types";

export const mockPaymentRepository: PaymentRepository = {
  async createPaymentReady(input) {
    return repositoryOk({
      id: `mock-payment-${input.orderNo}`,
      orderId: input.orderId,
      orderNo: input.orderNo,
      status: "ready",
      amount: input.amount,
      mockTid: "MOCK-PENDING",
    });
  },

  async recordPaymentApproved(paymentId, tid, amount) {
    const payment = mockPayments.find((item) => item.id === paymentId);

    if (!payment) {
      return repositoryError("NOT_FOUND", "Payment not found", paymentId);
    }

    return repositoryOk({
      ...payment,
      status: "approved_mock",
      amount,
      mockTid: tid,
      approvedAt: new Date().toISOString(),
    });
  },

  async recordPaymentFailed(paymentId) {
    const payment = mockPayments.find((item) => item.id === paymentId);

    if (!payment) {
      return repositoryError("NOT_FOUND", "Payment not found", paymentId);
    }

    return repositoryOk({ ...payment, status: "failed_mock" });
  },

  async appendPaymentEvent(event) {
    return repositoryOk({
      id: `mock-payment-event-${event.paymentId}-${event.createdAt}`,
      ...event,
    });
  },
};
