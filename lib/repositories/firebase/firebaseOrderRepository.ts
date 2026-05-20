import type { OrderRepository } from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";

export const firebaseOrderRepository: OrderRepository = {
  async listOrders() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase order repository is a stub. Firebase SDK is not connected.");
  },

  async getOrderByOrderNo(orderNo) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase order repository is a stub. Firebase SDK is not connected.", orderNo);
  },

  async listOrdersByNursery(nurseryId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase order repository is a stub. Firebase SDK is not connected.", nurseryId);
  },

  async listOrderItemsByCompany(companyId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase order repository is a stub. Firebase SDK is not connected.", companyId);
  },

  async createOrderFromQrSnapshot() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase order repository is a stub. Firebase SDK is not connected.");
  },
};
