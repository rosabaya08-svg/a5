import type { CommerceRepositories } from "@/lib/repositories/types";
import { mockAuditLogRepository } from "@/lib/repositories/mock/mockAuditLogRepository";
import { mockInventoryRepository } from "@/lib/repositories/mock/mockInventoryRepository";
import { mockOrderRepository } from "@/lib/repositories/mock/mockOrderRepository";
import { mockPaymentRepository } from "@/lib/repositories/mock/mockPaymentRepository";
import { mockProductRepository } from "@/lib/repositories/mock/mockProductRepository";
import { mockQrSessionRepository } from "@/lib/repositories/mock/mockQrSessionRepository";

export const mockRepositories: CommerceRepositories = {
  products: mockProductRepository,
  qrSessions: mockQrSessionRepository,
  orders: mockOrderRepository,
  payments: mockPaymentRepository,
  inventory: mockInventoryRepository,
  auditLogs: mockAuditLogRepository,
};

export {
  mockAuditLogRepository,
  mockInventoryRepository,
  mockOrderRepository,
  mockPaymentRepository,
  mockProductRepository,
  mockQrSessionRepository,
};
