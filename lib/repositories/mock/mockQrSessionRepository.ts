import { mockQrSessions } from "@/data/mockQrSessions";
import type { QrSessionRepository } from "@/lib/repositories/types";
import {
  assertNeverStatus,
  repositoryError,
  repositoryOk,
} from "@/lib/repositories/types";

function findQrById(qrSessionId: string) {
  return mockQrSessions.find((session) => session.id === qrSessionId);
}

export const mockQrSessionRepository: QrSessionRepository = {
  async listQrSessions(filters) {
    const sessions = mockQrSessions.filter((session) => {
      if (filters?.status && session.status !== filters.status) return false;
      if (filters?.nurseryId && session.nurseryId !== filters.nurseryId) return false;
      return true;
    });

    return repositoryOk(sessions);
  },

  async getQrSessionByShortCode(shortCode) {
    const session = mockQrSessions.find(
      (item) => item.shortCode.toLowerCase() === shortCode.toLowerCase(),
    );

    if (!session) {
      return repositoryError("NOT_FOUND", "QR session not found", shortCode);
    }

    return repositoryOk(session);
  },

  async createQrSessionDraft(input) {
    const totalAmount = input.items.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    );

    return repositoryOk({
      id: `mock-${input.cartId}`,
      shortCode: input.shortCode ?? "MOCKQR",
      type: input.type,
      status: "active",
      nurseryId: input.nurseryId,
      roomId: input.roomId,
      tabletId: input.tabletId,
      cartId: input.cartId,
      createdAt: input.createdAt ?? new Date().toISOString(),
      expiresAt: input.expiresAt,
      deliveryMethod: input.deliveryMethod,
      totalAmount,
      items: input.items,
      pickupLocation: input.pickupLocation,
    });
  },

  async markQrPaid(qrSessionId) {
    const session = findQrById(qrSessionId);

    if (!session) {
      return repositoryError("NOT_FOUND", "QR session not found", qrSessionId);
    }

    if (session.status !== "active") {
      return assertNeverStatus(session.status);
    }

    return repositoryOk({ ...session, status: "paid" });
  },

  async markQrExpired(qrSessionId) {
    const session = findQrById(qrSessionId);

    if (!session) {
      return repositoryError("NOT_FOUND", "QR session not found", qrSessionId);
    }

    if (session.status !== "active") {
      return assertNeverStatus(session.status);
    }

    return repositoryOk({ ...session, status: "expired" });
  },

  async markQrCancelled(qrSessionId) {
    const session = findQrById(qrSessionId);

    if (!session) {
      return repositoryError("NOT_FOUND", "QR session not found", qrSessionId);
    }

    if (session.status !== "active") {
      return assertNeverStatus(session.status);
    }

    return repositoryOk({ ...session, status: "cancelled" });
  },
};
