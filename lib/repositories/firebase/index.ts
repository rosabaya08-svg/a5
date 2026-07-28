import type { CommerceRepositories } from "@/lib/repositories/types";
import { firebaseAuditLogRepository } from "@/lib/repositories/firebase/firebaseAuditLogRepository";
import { firebaseCompanyRepository } from "@/lib/repositories/firebase/firebaseCompanyRepository";
import { firebaseContentRepository } from "@/lib/repositories/firebase/firebaseContentRepository";
import { firebaseInventoryRepository } from "@/lib/repositories/firebase/firebaseInventoryRepository";
import { firebaseNurseryRepository } from "@/lib/repositories/firebase/firebaseNurseryRepository";
import { firebaseOrderRepository } from "@/lib/repositories/firebase/firebaseOrderRepository";
import { firebasePaymentRepository } from "@/lib/repositories/firebase/firebasePaymentRepository";
import { firebaseProductOptionRepository } from "@/lib/repositories/firebase/firebaseProductOptionRepository";
import { firebaseProductRepository } from "@/lib/repositories/firebase/firebaseProductRepository";
import { firebaseQrSessionRepository } from "@/lib/repositories/firebase/firebaseQrSessionRepository";
import { firebaseRoomRepository } from "@/lib/repositories/firebase/firebaseRoomRepository";
import { firebaseTabletRepository } from "@/lib/repositories/firebase/firebaseTabletRepository";

export const firebaseRepositories: CommerceRepositories = {
  products: firebaseProductRepository,
  productOptions: firebaseProductOptionRepository,
  companies: firebaseCompanyRepository,
  nurseries: firebaseNurseryRepository,
  rooms: firebaseRoomRepository,
  tablets: firebaseTabletRepository,
  qrSessions: firebaseQrSessionRepository,
  orders: firebaseOrderRepository,
  payments: firebasePaymentRepository,
  inventory: firebaseInventoryRepository,
  auditLogs: firebaseAuditLogRepository,
  content: firebaseContentRepository,
};

export const firebaseRepositoryStubs = firebaseRepositories;

export {
  firebaseAuditLogRepository,
  firebaseCompanyRepository,
  firebaseContentRepository,
  firebaseInventoryRepository,
  firebaseNurseryRepository,
  firebaseOrderRepository,
  firebasePaymentRepository,
  firebaseProductOptionRepository,
  firebaseProductRepository,
  firebaseQrSessionRepository,
  firebaseRoomRepository,
  firebaseTabletRepository,
};
