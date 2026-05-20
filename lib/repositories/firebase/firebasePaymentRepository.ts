import type { PaymentRepository } from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";

export const firebasePaymentRepository: PaymentRepository = {
  async createPaymentReady() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase payment repository is a stub. Firebase SDK is not connected.");
  },

  async recordPaymentApproved(paymentId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase payment repository is a stub. Firebase SDK is not connected.", paymentId);
  },

  async recordPaymentFailed(paymentId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase payment repository is a stub. Firebase SDK is not connected.", paymentId);
  },

  async appendPaymentEvent(event) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase payment repository is a stub. Firebase SDK is not connected.", event.paymentId);
  },
};
