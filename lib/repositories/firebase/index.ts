import type { CommerceRepositories } from "@/lib/repositories/types";
import { firebaseAuditLogRepository } from "@/lib/repositories/firebase/firebaseAuditLogRepository";
import { firebaseInventoryRepository } from "@/lib/repositories/firebase/firebaseInventoryRepository";
import { firebaseOrderRepository } from "@/lib/repositories/firebase/firebaseOrderRepository";
import { firebasePaymentRepository } from "@/lib/repositories/firebase/firebasePaymentRepository";
import { firebaseProductRepository } from "@/lib/repositories/firebase/firebaseProductRepository";
import { firebaseQrSessionRepository } from "@/lib/repositories/firebase/firebaseQrSessionRepository";

export const firebaseRepositoryStubs: CommerceRepositories = {
  products: firebaseProductRepository,
  qrSessions: firebaseQrSessionRepository,
  orders: firebaseOrderRepository,
  payments: firebasePaymentRepository,
  inventory: firebaseInventoryRepository,
  auditLogs: firebaseAuditLogRepository,
};

export {
  firebaseAuditLogRepository,
  firebaseInventoryRepository,
  firebaseOrderRepository,
  firebasePaymentRepository,
  firebaseProductRepository,
  firebaseQrSessionRepository,
};
