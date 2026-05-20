import type { QrSessionRepository } from "@/lib/repositories/types";
import { repositoryError } from "@/lib/repositories/types";

export const firebaseQrSessionRepository: QrSessionRepository = {
  async listQrSessions() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase QR session repository is a stub. Firebase SDK is not connected.");
  },

  async getQrSessionByShortCode(shortCode) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase QR session repository is a stub. Firebase SDK is not connected.", shortCode);
  },

  async createQrSessionDraft() {
    return repositoryError("NOT_IMPLEMENTED", "Firebase QR session repository is a stub. Firebase SDK is not connected.");
  },

  async markQrPaid(qrSessionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase QR session repository is a stub. Firebase SDK is not connected.", qrSessionId);
  },

  async markQrExpired(qrSessionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase QR session repository is a stub. Firebase SDK is not connected.", qrSessionId);
  },

  async markQrCancelled(qrSessionId) {
    return repositoryError("NOT_IMPLEMENTED", "Firebase QR session repository is a stub. Firebase SDK is not connected.", qrSessionId);
  },
};
