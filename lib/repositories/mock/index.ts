import type { CommerceRepositories } from "@/lib/repositories/types";
import { mockAuditLogRepository } from "@/lib/repositories/mock/mockAuditLogRepository";
import { mockCompanyRepository } from "@/lib/repositories/mock/mockCompanyRepository";
import { mockContentRepository } from "@/lib/repositories/mock/mockContentRepository";
import { mockInventoryRepository } from "@/lib/repositories/mock/mockInventoryRepository";
import { mockNurseryRepository } from "@/lib/repositories/mock/mockNurseryRepository";
import { mockOrderRepository } from "@/lib/repositories/mock/mockOrderRepository";
import { mockPaymentRepository } from "@/lib/repositories/mock/mockPaymentRepository";
import { mockProductOptionRepository } from "@/lib/repositories/mock/mockProductOptionRepository";
import { mockProductRepository } from "@/lib/repositories/mock/mockProductRepository";
import { mockQrSessionRepository } from "@/lib/repositories/mock/mockQrSessionRepository";
import { mockRoomRepository } from "@/lib/repositories/mock/mockRoomRepository";
import { mockTabletRepository } from "@/lib/repositories/mock/mockTabletRepository";

export const mockRepositories: CommerceRepositories = {
  products: mockProductRepository,
  productOptions: mockProductOptionRepository,
  companies: mockCompanyRepository,
  nurseries: mockNurseryRepository,
  rooms: mockRoomRepository,
  tablets: mockTabletRepository,
  qrSessions: mockQrSessionRepository,
  orders: mockOrderRepository,
  payments: mockPaymentRepository,
  inventory: mockInventoryRepository,
  auditLogs: mockAuditLogRepository,
  content: mockContentRepository,
};

export {
  mockAuditLogRepository,
  mockCompanyRepository,
  mockContentRepository,
  mockInventoryRepository,
  mockNurseryRepository,
  mockOrderRepository,
  mockPaymentRepository,
  mockProductOptionRepository,
  mockProductRepository,
  mockQrSessionRepository,
  mockRoomRepository,
  mockTabletRepository,
};
